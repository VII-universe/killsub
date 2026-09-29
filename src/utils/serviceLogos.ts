export const SERVICE_DOMAINS: Record<string, string> = {
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'youtube': 'youtube.com',
  'youtube premium': 'youtube.com',
  'chatgpt': 'openai.com',
  'chatgpt plus': 'openai.com',
  'openai': 'openai.com',
  'claude': 'anthropic.com',
  'claude pro': 'anthropic.com',
  'anthropic': 'anthropic.com',
  'github': 'github.com',
  'github copilot': 'github.com',
  'icloud': 'apple.com',
  'icloud+': 'apple.com',
  'apple tv': 'apple.com',
  'apple arcade': 'apple.com',
  'apple music': 'apple.com',
  'apple one': 'apple.com',
  'google one': 'google.com',
  'google workspace': 'workspace.google.com',
  'gemini': 'gemini.google.com',
  'gemini advanced': 'gemini.google.com',
  'dropbox': 'dropbox.com',
  'onedrive': 'microsoft.com',
  'microsoft 365': 'microsoft.com',
  'office 365': 'microsoft.com',
  'xbox': 'xbox.com',
  'xbox game pass': 'xbox.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'adobe': 'adobe.com',
  'adobe cc': 'adobe.com',
  'adobe creative cloud': 'adobe.com',
  'canva': 'canva.com',
  'canva pro': 'canva.com',
  'midjourney': 'midjourney.com',
  'discord': 'discord.com',
  'discord nitro': 'discord.com',
  'slack': 'slack.com',
  'zoom': 'zoom.us',
  'linear': 'linear.app',
  'jira': 'atlassian.com',
  'confluence': 'atlassian.com',
  'trello': 'trello.com',
  'asana': 'asana.com',
  'todoist': 'todoist.com',
  'nord vpn': 'nordvpn.com',
  'nordvpn': 'nordvpn.com',
  'expressvpn': 'expressvpn.com',
  '1password': '1password.com',
  'bitwarden': 'bitwarden.com',
  'lastpass': 'lastpass.com',
  'dashlane': 'dashlane.com',
  'disney+': 'disneyplus.com',
  'disney plus': 'disneyplus.com',
  'hbo max': 'max.com',
  'max': 'max.com',
  'paramount+': 'paramountplus.com',
  'apple tv+': 'apple.com',
  'twitch': 'twitch.tv',
  'steam': 'steampowered.com',
  'playstation': 'playstation.com',
  'playstation plus': 'playstation.com',
  'nintendo': 'nintendo.com',
  'nintendo switch online': 'nintendo.com',
  'cursor': 'cursor.com',
  'cursor pro': 'cursor.com',
  'perplexity': 'perplexity.ai',
  'grammarly': 'grammarly.com',
  'duolingo': 'duolingo.com',
  'headspace': 'headspace.com',
  'calm': 'calm.com',
  'strava': 'strava.com',
  'revolut': 'revolut.com',
  'dropbox plus': 'dropbox.com',
  'backblaze': 'backblaze.com',
}

export function getServiceDomain(name: string): string | null {
  const n = (name || '').toLowerCase().trim()
  // exact match first
  if (SERVICE_DOMAINS[n]) return SERVICE_DOMAINS[n]
  // partial match
  for (const [key, domain] of Object.entries(SERVICE_DOMAINS)) {
    if (n.includes(key) || key.includes(n)) return domain
  }
  return null
}

// Clearbit's free Logo API (logo.clearbit.com) shut down on 2025-12-08 and no longer resolves.
// Google's favicon service is the no-signup replacement — lower fidelity than a vector logo,
// but reliably available for essentially any domain without an API key.
export function getLogoUrl(name: string): string | null {
  const domain = getServiceDomain(name)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}
