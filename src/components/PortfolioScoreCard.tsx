'use client'

import { useMemo } from 'react'
import { Subscription } from './SubscriptionList'
import { computeHealthScore, daysSince } from '@/utils/health'

function scoreColor(score: number): string {
  if (score <= 40) return '#f43f5e' // rose-500
  if (score <= 70) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export default function PortfolioScoreCard({ subscriptions }: { subscriptions: Subscription[] }) {
  const { averageScore, tip } = useMemo(() => {
    if (subscriptions.length === 0) return { averageScore: null, tip: null }

    const scored = subscriptions.map((s) => ({ sub: s, score: computeHealthScore(s) }))
    const averageScore = Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)

    const lowest = [...scored].sort((a, b) => a.score - b.score)[0]
    let tip: { name: string; days: number; pointsGained: number } | null = null

    if (lowest && lowest.score < 90) {
      const referenceDate = lowest.sub.last_used_at || lowest.sub.created_at
      const days = referenceDate ? daysSince(referenceDate) : 0

      const withoutLowest = scored.filter((s) => s.sub.id !== lowest.sub.id)
      const newAverage =
        withoutLowest.length > 0
          ? Math.round(withoutLowest.reduce((sum, s) => sum + s.score, 0) / withoutLowest.length)
          : 100

      tip = { name: lowest.sub.name, days, pointsGained: Math.max(0, newAverage - averageScore) }
    }

    return { averageScore, tip }
  }, [subscriptions])

  if (averageScore === null) return null

  const color = scoreColor(averageScore)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (averageScore / 100) * circumference

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-4 py-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
          <svg className="-rotate-90" width={72} height={72} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-white" style={{ fontSize: 20, fontWeight: 800 }}>{averageScore}</span>
            <span className="font-bold text-white/50" style={{ fontSize: 10 }}>/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-extrabold uppercase tracking-wider text-white/60" style={{ fontSize: 10 }}>
            Portfolio skóre
          </span>
          {tip ? (
            <p className="mt-1 text-xs text-white/80 leading-snug">
              <span className="font-black text-white">{tip.name}</span> jsi nepoužil {tip.days} dní →
              zvažte zrušení{tip.pointsGained > 0 ? ` (+${tip.pointsGained} bodů)` : ''}
            </p>
          ) : (
            <p className="mt-1 text-xs text-emerald-300 font-bold">Všechna předplatná jsou v dobré kondici 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}
