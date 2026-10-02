export const CANCEL_LINKS: Record<string, { url: string; steps: string[] }> = {
  'Netflix': {
    url: 'https://www.netflix.com/cancelplan',
    steps: ['Otevři netflix.com', 'Účet → Členství a platby', 'Klikni "Zrušit členství"'],
  },
  'Spotify': {
    url: 'https://www.spotify.com/account/subscription/cancel',
    steps: ['Otevři spotify.com/account', 'Předplatné → Změnit nebo zrušit', 'Klikni "Zrušit Premium"'],
  },
  'YouTube Premium': {
    url: 'https://myaccount.google.com/payments-and-subscriptions',
    steps: ['Otevři Google účet', 'Platby a předplatné', 'Najdi YouTube Premium → Spravovat'],
  },
  'Disney+': {
    url: 'https://www.disneyplus.com/account/subscription',
    steps: ['Otevři disneyplus.com', 'Účet → Předplatné', 'Klikni "Zrušit předplatné"'],
  },
  'Apple TV+': {
    url: 'https://appleid.apple.com/account/manage',
    steps: ['Otevři appleid.apple.com', 'Předplatná', 'Klikni Apple TV+ → Zrušit'],
  },
  'Apple Music': {
    url: 'https://appleid.apple.com/account/manage',
    steps: ['Otevři appleid.apple.com', 'Předplatná', 'Klikni Apple Music → Zrušit'],
  },
  'iCloud+': {
    url: 'https://appleid.apple.com/account/manage',
    steps: ['Otevři appleid.apple.com', 'Předplatná', 'Klikni iCloud+ → Zrušit'],
  },
  'Adobe Creative Cloud': {
    url: 'https://account.adobe.com/plans',
    steps: ['Otevři account.adobe.com', 'Plány → Spravovat plán', 'Klikni "Zrušit plán"'],
  },
  'Microsoft 365': {
    url: 'https://account.microsoft.com/services',
    steps: ['Otevři account.microsoft.com', 'Služby a předplatné', 'Najdi Microsoft 365 → Zrušit'],
  },
  'ChatGPT Plus': {
    url: 'https://chat.openai.com/#settings',
    steps: ['Otevři ChatGPT', 'Nastavení → Moje předplatné', 'Klikni "Spravovat předplatné"'],
  },
  'Claude Pro': {
    url: 'https://claude.ai/settings',
    steps: ['Otevři claude.ai/settings', 'Předplatné', 'Klikni "Zrušit předplatné"'],
  },
  'Notion': {
    url: 'https://www.notion.so/profile/plans',
    steps: ['Otevři Notion nastavení', 'Plány', 'Downgrade na Free'],
  },
  'Figma': {
    url: 'https://www.figma.com/settings',
    steps: ['Otevři Figma nastavení', 'Plány a platby', 'Zrušit plán'],
  },
  'GitHub Copilot': {
    url: 'https://github.com/settings/copilot',
    steps: ['Otevři github.com/settings/copilot', 'Klikni "Manage Copilot subscription"', 'Zrušit předplatné'],
  },
  'Dropbox': {
    url: 'https://www.dropbox.com/account/plan',
    steps: ['Otevři dropbox.com/account', 'Plán', 'Downgrade na Basic (zdarma)'],
  },
  'Google One': {
    url: 'https://one.google.com/storage',
    steps: ['Otevři one.google.com', 'Spravovat předplatné', 'Zrušit Google One'],
  },
  'Deezer': {
    url: 'https://www.deezer.com/account',
    steps: ['Otevři deezer.com/account', 'Předplatné', 'Zrušit předplatné'],
  },
  'HBO Max': {
    url: 'https://www.max.com/settings/subscription',
    steps: ['Otevři max.com', 'Nastavení → Předplatné', 'Zrušit předplatné'],
  },
}

export function getCancelInfo(serviceName: string) {
  const exact = CANCEL_LINKS[serviceName]
  if (exact) return exact
  const lower = serviceName.toLowerCase()
  const key = Object.keys(CANCEL_LINKS).find((k) => k.toLowerCase() === lower || lower.includes(k.toLowerCase()))
  return key ? CANCEL_LINKS[key] : null
}
