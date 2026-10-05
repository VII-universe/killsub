export type TaxCategory = 'personal' | 'business'

// Keyword lists straight from the feature spec — a best-effort default the
// user can always override via the card toggle, not a strict classifier.
const BUSINESS_KEYWORDS = [
  'vercel', 'github', 'supabase', 'notion', 'slack', 'linear', 'figma', 'adobe',
  'microsoft 365', 'google workspace', 'aws', 'heroku', 'digitalocean', 'openai',
  'anthropic', 'cursor', 'raycast', '1password', 'nordvpn',
]

const PERSONAL_KEYWORDS = [
  'netflix', 'spotify', 'disney', 'hbo', 'youtube', 'apple tv', 'duolingo',
  'tinder', 'fitness', 'gym',
]

export function suggestTaxCategory(name: string): TaxCategory | null {
  const lower = name.toLowerCase()
  if (BUSINESS_KEYWORDS.some((k) => lower.includes(k))) return 'business'
  if (PERSONAL_KEYWORDS.some((k) => lower.includes(k))) return 'personal'
  return null
}
