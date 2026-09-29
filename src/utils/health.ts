export interface HealthInput {
  created_at?: string | null
  last_used_at?: string | null
  health_score?: number | null
  health_score_manual?: boolean | null
}

const DAY_MS = 1000 * 60 * 60 * 24
const GRACE_DAYS = 90

/**
 * Score decays 1 point per day of inactivity once the 90-day grace period
 * (since the subscription was added, or last marked as used) has passed.
 */
export function computeHealthScore(sub: HealthInput): number {
  if (sub.health_score_manual && typeof sub.health_score === 'number') {
    return sub.health_score
  }

  const referenceDate = sub.last_used_at || sub.created_at
  if (!referenceDate) return 100

  const daysSince = Math.floor((Date.now() - new Date(referenceDate).getTime()) / DAY_MS)
  if (daysSince <= GRACE_DAYS) return 100

  return Math.max(1, 100 - (daysSince - GRACE_DAYS))
}

export function getHealthTone(score: number): 'good' | 'warning' | 'low' {
  if (score < 40) return 'low'
  if (score < 70) return 'warning'
  return 'good'
}
