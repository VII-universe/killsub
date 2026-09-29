export const CATEGORIES = [
  'Zábava',
  'Produktivita',
  'AI nástroje',
  'Úložiště',
  'Bezpečnost',
  'Zdraví',
  'Finance',
  'Ostatní',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_COLORS: Record<Category, string> = {
  'Zábava': '#ec4899',
  'Produktivita': '#3b82f6',
  'AI nástroje': '#14b8a6',
  'Úložiště': '#f59e0b',
  'Bezpečnost': '#ef4444',
  'Zdraví': '#22c55e',
  'Finance': '#a855f7',
  'Ostatní': '#64748b',
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

// Best-effort auto suggestion based on service name, used to pre-fill the dropdown.
export function suggestCategory(name: string): Category {
  const n = (name || '').toLowerCase()

  if (/netflix|spotify|disney|hbo|max|youtube|apple tv|prime video|twitch|steam|xbox|playstation|game/.test(n)) {
    return 'Zábava'
  }
  if (/chatgpt|openai|claude|anthropic|gemini|midjourney|copilot|cursor|perplexity/.test(n)) {
    return 'AI nástroje'
  }
  if (/icloud|drive|dropbox|onedrive|storage|backblaze|úložiště/.test(n)) {
    return 'Úložiště'
  }
  if (/vpn|antivirus|nord|1password|bitwarden|lastpass|security|firewall/.test(n)) {
    return 'Bezpečnost'
  }
  if (/gym|fitness|strava|peloton|health|zdraví|meditation|calm|headspace/.test(n)) {
    return 'Zdraví'
  }
  if (/bank|finance|invest|budget|revolut|mint|účet/.test(n)) {
    return 'Finance'
  }
  if (/notion|figma|adobe|canva|office|workspace|slack|linear|jira|github/.test(n)) {
    return 'Produktivita'
  }
  return 'Ostatní'
}
