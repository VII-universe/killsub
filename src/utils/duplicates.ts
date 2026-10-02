import { Subscription } from '@/components/SubscriptionList'

const STREAMING = ['netflix', 'disney', 'hbo', 'apple tv', 'youtube premium', 'prima', 'voyo']
const MUSIC = ['spotify', 'apple music', 'deezer', 'tidal', 'youtube music']
const CLOUD = ['icloud', 'google one', 'dropbox', 'onedrive']
const AI = ['chatgpt', 'claude', 'midjourney', 'copilot', 'gemini']

export interface DuplicateWarning {
  category: string
  services: string[]
  totalAmount: number
}

export function detectDuplicates(subscriptions: Subscription[]): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = []
  const groups = [
    { category: 'Streaming', keywords: STREAMING },
    { category: 'Hudba', keywords: MUSIC },
    { category: 'Cloud úložiště', keywords: CLOUD },
    { category: 'AI nástroje', keywords: AI },
  ]

  for (const group of groups) {
    const matches = subscriptions.filter((s) =>
      group.keywords.some((k) => s.name.toLowerCase().includes(k))
    )
    if (matches.length >= 2) {
      warnings.push({
        category: group.category,
        services: matches.map((s) => s.name),
        totalAmount: matches.reduce((sum, s) => {
          const amt = Number(s.amount) || 0
          return sum + (s.billing_cycle === 'yearly' ? amt / 12 : amt)
        }, 0),
      })
    }
  }
  return warnings
}
