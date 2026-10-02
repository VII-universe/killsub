import Papa from 'papaparse'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
}

export type BillingCycle = 'monthly' | 'yearly' | 'weekly'
export type Confidence = 'high' | 'medium' | 'low'

export interface DetectedSubscription {
  name: string
  amount: number
  currency: string
  billing_cycle: BillingCycle
  confidence: Confidence
}

const DATE_HEADERS = ['date', 'datum', 'transaction date', 'datum transakce', 'datum provedení', 'datum zaúčtování']
const AMOUNT_HEADERS = ['amount', 'castka', 'částka', 'value', 'suma', 'hodnota', 'objem']
const DESC_HEADERS = [
  'description', 'popis', 'recipient', 'příjemce', 'prijemce', 'note', 'poznámka', 'poznamka',
  'message', 'zpráva', 'zprava', 'merchant', 'payee', 'protiucet', 'protiúčet', 'název protiúčtu',
  'nazev protiuctu', 'detail platby',
]

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(normalizeHeader(h)))
}

// Heuristic column detection — bank CSV exports vary wildly in column naming
// across providers (Fio, Air Bank, ČSOB, KB, Raiffeisen, Monzo, Revolut, N26, ...),
// so we match against a list of common header spellings rather than a fixed schema.
export function parseCsvTransactions(csvText: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const rows = result.data
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])
  const dateHeader = findHeader(headers, DATE_HEADERS)
  const amountHeader = findHeader(headers, AMOUNT_HEADERS)
  const descHeader = findHeader(headers, DESC_HEADERS)

  if (!amountHeader) return []

  return rows
    .map((row) => {
      const rawAmount = (row[amountHeader] || '').replace(/\s/g, '').replace(',', '.')
      const amount = parseFloat(rawAmount)
      return {
        date: dateHeader ? row[dateHeader] || '' : '',
        description: descHeader ? row[descHeader] || '' : '',
        amount,
      }
    })
    .filter((t) => !isNaN(t.amount))
}

export function transactionsToText(transactions: ParsedTransaction[]): string {
  return transactions.map((t) => `${t.date} | ${t.description} | ${t.amount}`).join('\n')
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

const SYSTEM_PROMPT = `You are a financial analyst. Given a list of bank transactions, identify recurring subscription payments.
For each subscription found, return JSON array with objects:
{ name: string, amount: number, currency: string, billing_cycle: "monthly"|"yearly"|"weekly", confidence: "high"|"medium"|"low" }
Only include payments that appear to be subscriptions (streaming, software, SaaS, cloud storage, etc.).
Return ONLY valid JSON array, no explanation.`

const BILLING_CYCLES: BillingCycle[] = ['monthly', 'yearly', 'weekly']
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function detectSubscriptionsFromText(
  transactionsText: string,
  defaultCurrency = 'CZK'
): Promise<DetectedSubscription[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Chybí platný OPENROUTER_API_KEY.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://killsub.vercel.app',
      'X-Title': 'Killsub',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Default currency if not specified in a transaction: ${defaultCurrency}\n\nTransactions:\n${transactionsText}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API chyba: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const raw = (data.choices?.[0]?.message?.content || '[]').trim()
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI vrátilo neplatný formát odpovědi.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI vrátilo neplatný formát odpovědi.')
  }

  return parsed
    .filter(isRecord)
    .filter((item) => typeof item.name === 'string' && typeof item.amount === 'number')
    .map((item) => ({
      name: item.name as string,
      amount: item.amount as number,
      currency: typeof item.currency === 'string' && item.currency ? (item.currency as string).toUpperCase() : defaultCurrency,
      billing_cycle: BILLING_CYCLES.includes(item.billing_cycle as BillingCycle)
        ? (item.billing_cycle as BillingCycle)
        : 'monthly',
      confidence: CONFIDENCES.includes(item.confidence as Confidence) ? (item.confidence as Confidence) : 'low',
    }))
}
