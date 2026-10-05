'use client'

import { useMemo } from 'react'
import { Subscription } from './SubscriptionList'
import { CATEGORY_COLORS } from '@/utils/categories'
import { effectiveAmount } from '@/utils/subscriptionCost'

export default function CategoryChart({ subscriptions }: { subscriptions: Subscription[] }) {
  const { bars, dominantCurrency, total } = useMemo(() => {
    if (subscriptions.length === 0) {
      return { bars: [], dominantCurrency: 'CZK', total: 0 }
    }

    const currencyCounts: Record<string, number> = {}
    subscriptions.forEach((s) => {
      currencyCounts[s.currency] = (currencyCounts[s.currency] || 0) + 1
    })
    const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0]

    const byCategory: Record<string, number> = {}
    subscriptions
      .filter((s) => s.currency === dominantCurrency)
      .forEach((s) => {
        const amt = effectiveAmount(s)
        const monthly = s.billing_cycle === 'yearly' ? amt / 12 : amt
        const cat = s.category?.trim() || 'Ostatní'
        byCategory[cat] = (byCategory[cat] || 0) + monthly
      })

    const total = Object.values(byCategory).reduce((a, b) => a + b, 0)
    const bars = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#64748b',
      }))

    return { bars, dominantCurrency, total }
  }, [subscriptions])

  if (bars.length === 0) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4.5 shadow-lg backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          Výdaje dle kategorie
        </h3>
        <span className="text-[11px] font-mono font-bold text-white/60">
          {total.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {dominantCurrency}/měs.
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {bars.map((b) => (
          <div
            key={b.category}
            style={{ width: `${b.pct}%`, backgroundColor: b.color }}
            title={`${b.category}: ${b.pct.toFixed(0)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3.5 space-y-2">
        {bars.map((b) => (
          <div key={b.category} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="font-bold text-white/80 truncate">{b.category}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-white/50">{b.pct.toFixed(0)}%</span>
              <span className="font-mono font-black text-white">
                {b.amount.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {dominantCurrency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
