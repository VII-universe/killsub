'use client'

import { useMemo } from 'react'
import { Subscription } from './SubscriptionList'
import { effectiveAmount } from '@/utils/subscriptionCost'

function monthlyAmount(sub: Subscription): number {
  const amt = effectiveAmount(sub)
  if (sub.billing_cycle === 'yearly') return amt / 12
  if (sub.billing_cycle === 'weekly') return amt * 4
  return amt
}

export default function BudgetProgressBar({
  subscriptions,
  monthlyBudget,
}: {
  subscriptions: Subscription[]
  monthlyBudget: number | null
}) {
  const monthlyTotal = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status !== 'cancelled')
        .reduce((sum, s) => sum + monthlyAmount(s), 0),
    [subscriptions]
  )

  if (monthlyBudget === null || monthlyBudget <= 0) return null

  const pct = (monthlyTotal / monthlyBudget) * 100
  const isOver = monthlyTotal > monthlyBudget
  const isWarning = !isOver && pct >= 80

  const barColor = isOver ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white/80">
          Měsíční výdaje: {Math.round(monthlyTotal).toLocaleString('cs-CZ')} Kč / {Math.round(monthlyBudget).toLocaleString('cs-CZ')} Kč
        </span>
        <span className="font-mono font-black" style={{ color: barColor }}>
          {Math.round(pct)}%
        </span>
      </div>

      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>

      {isOver && (
        <p className="mt-2 text-[11px] font-bold text-rose-300">
          ⚠️ Překračuješ rozpočet o {Math.round(monthlyTotal - monthlyBudget).toLocaleString('cs-CZ')} Kč
        </p>
      )}
    </div>
  )
}
