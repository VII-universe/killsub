import type { TrueLayerTransaction } from './trueLayer'

export interface SubscriptionForPriceCheck {
  id: string
  name: string
}

export interface PriceChange {
  subscriptionId: string
  subscriptionName: string
  oldAmount: number
  newAmount: number
  currency: string
  changePercent: number
  detectedAt: string
}

// Same fuzzy-match style as cancelLinks.ts/appleBundles.ts: strip to
// alphanumerics and check containment either way, since bank merchant
// strings carry prefixes/suffixes (e.g. "NETFLIX.COM 866-579...") that a
// subscription's plain name never has, and vice versa for short names.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesSubscription(transactionLabel: string, subscriptionName: string): boolean {
  const t = normalize(transactionLabel)
  const s = normalize(subscriptionName)
  if (!t || !s) return false
  return t.includes(s) || s.includes(t)
}

const MIN_CHANGE_PERCENT = 5
const MIN_CHANGE_ABSOLUTE = 5

// Only flags increases — this is a "did my subscription get more expensive"
// detector, not a general price-change detector (a price drop is good news,
// not something to warn about).
export function detectPriceChanges(
  transactions: TrueLayerTransaction[],
  subscriptions: SubscriptionForPriceCheck[]
): PriceChange[] {
  const changes: PriceChange[] = []

  for (const sub of subscriptions) {
    const matched = transactions
      .filter((t) => matchesSubscription(t.merchant_name || t.description, sub.name))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Need at least 2 "old" payments and 2 "recent" payments to compare averages.
    if (matched.length < 4) continue

    const amounts = matched.map((t) => Math.abs(t.amount))
    const recentTwo = amounts.slice(-2)
    const previousTwo = amounts.slice(-4, -2)

    const recentAvg = (recentTwo[0] + recentTwo[1]) / 2
    const previousAvg = (previousTwo[0] + previousTwo[1]) / 2
    if (previousAvg === 0) continue

    const diff = recentAvg - previousAvg
    const changePercent = (diff / previousAvg) * 100

    if (diff > MIN_CHANGE_ABSOLUTE && changePercent > MIN_CHANGE_PERCENT) {
      changes.push({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        oldAmount: Math.round(previousAvg * 100) / 100,
        newAmount: Math.round(recentAvg * 100) / 100,
        currency: matched[matched.length - 1].currency,
        changePercent: Math.round(changePercent * 10) / 10,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return changes
}
