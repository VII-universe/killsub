import crypto from 'crypto'

const AUTH_BASE = 'https://auth.truelayer-sandbox.com'
const API_BASE = 'https://api.truelayer-sandbox.com'

// TrueLayer only issues a refresh_token when `offline_access` is requested —
// the spec's bank_connections.refresh_token column would otherwise always be
// null, so this scope is added beyond the literal "accounts transactions" ask.
const SCOPES = 'accounts transactions offline_access'

// TrueLayer's sandbox auth page needs an explicit provider list — without it
// the auth server has nothing to resolve against and rejects the request
// outright with a generic Bad Request.
//
// `uk-ob-all`, `de-ob-all`, etc. are production Open Banking provider-group
// wildcards — they don't exist against auth.truelayer-sandbox.com, so using
// them here was itself producing the Bad Request this value is meant to fix.
// Sandbox only recognizes the mock bank, `uk-cs-mock` (login: john / doe).
//
// This module's AUTH_BASE/API_BASE are hardcoded to the -sandbox hosts (per
// the original integration task), so PROVIDERS is hardcoded to match rather
// than guessing environment from e.g. a client_id prefix — TrueLayer client
// IDs aren't documented to carry a "sandbox-" prefix, and a provider switch
// that didn't also flip AUTH_BASE/API_BASE would be worse than this. Going
// live later means updating all three together.
const PROVIDERS = 'uk-cs-mock'

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generatePkce() {
  const codeVerifier = base64url(crypto.randomBytes(32))
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge }
}

export function generateState() {
  return base64url(crypto.randomBytes(16))
}

export function buildAuthUrl(params: { state: string; codeChallenge: string }) {
  const clientId = process.env.TRUELAYER_CLIENT_ID
  const redirectUri = process.env.TRUELAYER_REDIRECT_URI
  if (!clientId || !redirectUri) {
    throw new Error('Chybí TRUELAYER_CLIENT_ID nebo TRUELAYER_REDIRECT_URI.')
  }

  const url = new URL(AUTH_BASE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('providers', PROVIDERS)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const clientId = process.env.TRUELAYER_CLIENT_ID
  const clientSecret = process.env.TRUELAYER_CLIENT_SECRET
  const redirectUri = process.env.TRUELAYER_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Chybí konfigurace TrueLayer.')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  })

  const response = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`TrueLayer token exchange selhal: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.TRUELAYER_CLIENT_ID
  const clientSecret = process.env.TRUELAYER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Chybí konfigurace TrueLayer.')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const response = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`TrueLayer token refresh selhal: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

export interface TrueLayerTransaction {
  transaction_id: string
  timestamp: string
  description: string
  amount: number
  currency: string
  transaction_type: string
  merchant_name?: string
}

// TrueLayer has no single flat "/data/v1/transactions" endpoint (unlike what
// a literal reading of the spec assumes) — transactions are scoped per
// account, so this lists accounts first and merges each account's last-90-day
// transactions.
export async function fetchRecentTransactions(accessToken: string): Promise<TrueLayerTransaction[]> {
  const accountsRes = await fetch(`${API_BASE}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!accountsRes.ok) {
    throw new Error(`TrueLayer accounts chyba: ${accountsRes.status} ${await accountsRes.text()}`)
  }
  const accountsData = await accountsRes.json()
  const accounts: Array<{ account_id: string }> = accountsData.results || []

  const to = new Date()
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)

  const allTransactions: TrueLayerTransaction[] = []

  for (const account of accounts) {
    const url = new URL(`${API_BASE}/data/v1/accounts/${account.account_id}/transactions`)
    url.searchParams.set('from', from.toISOString())
    url.searchParams.set('to', to.toISOString())

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) continue

    const data = await res.json()
    allTransactions.push(...(data.results || []))
  }

  return allTransactions
}

export interface DetectedBankSubscription {
  name: string
  amount: number
  currency: string
  frequency: 'monthly' | 'yearly'
  first_seen: string | null
}

const DETECT_SYSTEM_PROMPT = `You are a financial analyst. Given a list of bank transactions (JSON), identify recurring payments that look like subscriptions (streaming, software, SaaS, cloud storage, memberships, etc.).
For each one found, return an object: { name: string, amount: number, currency: string, frequency: "monthly"|"yearly", first_seen: string (ISO date of the earliest matching transaction) }.
Return ONLY a valid JSON array, no explanation.`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function detectSubscriptionsFromTransactions(
  transactions: TrueLayerTransaction[]
): Promise<DetectedBankSubscription[]> {
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
        { role: 'system', content: DETECT_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(transactions) },
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
      currency: typeof item.currency === 'string' ? item.currency : 'CZK',
      frequency: item.frequency === 'yearly' ? 'yearly' : 'monthly',
      first_seen: typeof item.first_seen === 'string' ? item.first_seen : null,
    }))
}
