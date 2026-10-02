interface SharableSubscription {
  amount: number
  shared?: boolean | null
  my_share?: number | null
}

// What the user actually pays: their split share when the subscription is
// shared and a share amount was set, otherwise the full price.
export function effectiveAmount(sub: SharableSubscription): number {
  if (sub.shared && sub.my_share !== null && sub.my_share !== undefined) {
    const share = Number(sub.my_share)
    if (!isNaN(share)) return share
  }
  return Number(sub.amount) || 0
}
