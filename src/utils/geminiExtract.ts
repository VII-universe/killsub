import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ExtractedSubscription {
  name: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'yearly'
  next_payment_date: string
}

/** Shared Gemini extraction used by both the manual AI-import UI and the inbound email webhook. */
export async function extractSubscriptionFromText(text: string): Promise<ExtractedSubscription> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    throw new Error('Chybí platný GEMINI_API_KEY.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
    systemInstruction: `Jsi expertní asistent pro automatickou extrakci údajů o předplatném z faktur, potvrzení a e-mailů.
Dnešní datum je: ${new Date().toISOString().split('T')[0]}.

Z poskytnutého textu extrahuj předplatné a vrať VÝHRADNĚ JSON objekt s následující strukturou:
{
  "name": string, // Název služby/produktu (např. "Netflix", "Spotify", "GitHub", "Canva", "Google Workspace")
  "amount": number, // Číselná hodnota částky/ceny bez symbolu měny (např. 299 nebo 9.99). Pokud je v textu více částek, vyber částku pravidelného poplatku.
  "currency": string, // Třípísmenný kód měny: "CZK", "EUR" nebo "USD". (Pokud je uvedeno "Kč", převeď na "CZK". Pokud symbol "€", převeď na "EUR", "$" na "USD". Pokud není jasné, použij "CZK").
  "billing_cycle": string, // Pouze hodnota "monthly" nebo "yearly". Pokud z kontextu plyne roční platba, uveď "yearly", jinak "monthly".
  "next_payment_date": string // Datum příští platby nebo konec aktuálního období ve formátu "YYYY-MM-DD". Pokud není uvedeno ani jej nelze jednoznačně odvodit, vrať prázdný řetězec "".
}
Nikdy nevracej žádný úvodní ani doplňující text, žádné markdown značky, pouze validní JSON.`,
  })

  const prompt = `Zde je obsah faktury / e-mailu:\n\n${text}`
  const result = await model.generateContent(prompt)
  const rawResponse = result.response.text().trim()

  const cleanJson = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const data = JSON.parse(cleanJson)

  return {
    name: typeof data.name === 'string' ? data.name : '',
    amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
    currency: ['CZK', 'EUR', 'USD'].includes(data.currency?.toUpperCase())
      ? data.currency.toUpperCase()
      : 'CZK',
    billing_cycle: data.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
    next_payment_date: typeof data.next_payment_date === 'string' ? data.next_payment_date : '',
  }
}
