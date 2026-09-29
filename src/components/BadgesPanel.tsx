'use client'

import { useEffect, useState } from 'react'
import { Subscription } from './SubscriptionList'
import { BADGES } from '@/utils/badges'

export default function BadgesPanel({ subscriptions }: { subscriptions: Subscription[] }) {
  // Badge conditions read localStorage (AI usage, streak, cleanse state), which is only
  // available after mount — render a stable "locked" pass on the server, then refresh.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold text-white mb-1">Odznaky</p>
      <p className="text-[11px] text-white/50 mb-3">Sbírejte odznaky za správu svých předplatných.</p>

      <div className="grid grid-cols-4 gap-3">
        {BADGES.map((badge) => {
          const earned = mounted && badge.isEarned(subscriptions)
          return (
            <div
              key={badge.id}
              title={earned ? `${badge.name} — splněno!` : `${badge.name}: ${badge.description}`}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                earned
                  ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10'
                  : 'border-white/5 bg-white/[0.02] grayscale opacity-40'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className={`text-[9px] font-bold text-center leading-tight ${earned ? 'text-white' : 'text-white/50'}`}>
                {badge.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
