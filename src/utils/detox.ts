import type { Subscription } from '@/components/SubscriptionList'
import { effectiveAmount } from './subscriptionCost'

export interface DetoxSession {
  id: string
  started_at: string
  ends_at: string
  status: 'active' | 'completed' | 'abandoned'
}

export const DETOX_DURATION_DAYS = 30

export function monthlyEquivalent(sub: Pick<Subscription, 'amount' | 'billing_cycle' | 'shared' | 'my_share'>): number {
  const amt = effectiveAmount(sub)
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

export function getDetoxProgress(session: DetoxSession, frozenSubs: Subscription[]) {
  const totalMonthly = frozenSubs.reduce((sum, s) => sum + monthlyEquivalent(s), 0)

  const start = new Date(session.started_at).getTime()
  const end = new Date(session.ends_at).getTime()
  const totalDurationMs = Math.max(end - start, 1)
  const now = Date.now()
  const elapsedMs = Math.min(Math.max(now - start, 0), totalDurationMs)

  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24))
  const totalDays = Math.max(Math.round(totalDurationMs / (1000 * 60 * 60 * 24)), 1)
  const percent = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100))

  const fractionElapsed = elapsedMs / totalDurationMs
  const savedSoFar = totalMonthly * fractionElapsed
  const remaining = totalMonthly - savedSoFar

  return { totalMonthly, elapsedDays, totalDays, percent, savedSoFar, remaining }
}

// Default checklist split when no 'essential' flag exists in the schema:
// business subscriptions are kept, everything else (personal + unclassified)
// defaults to freeze — the user can still re-check items before starting.
export function suggestFreezeDefault(sub: Pick<Subscription, 'tax_category'>): boolean {
  return sub.tax_category !== 'business'
}
