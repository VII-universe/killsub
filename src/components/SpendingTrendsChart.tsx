'use client'

import { useMemo } from 'react'
import { Subscription } from './SubscriptionList'
import { effectiveAmount } from '@/utils/subscriptionCost'

const MONTH_LABELS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

function monthlyAmount(sub: Subscription): number {
  const amt = effectiveAmount(sub)
  if (sub.billing_cycle === 'yearly') return amt / 12
  if (sub.billing_cycle === 'weekly') return amt * 4
  return amt
}

// A subscription without created_at is treated as always active; otherwise
// active from its creation month onward (same convention as WrappedView).
function wasActiveInMonth(sub: Subscription, year: number, monthIndex: number): boolean {
  if (!sub.created_at) return true
  const created = new Date(sub.created_at)
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
  return created <= monthEnd
}

const WIDTH = 320
const HEIGHT = 120
const PADDING = 8

export default function SpendingTrendsChart({
  subscriptions,
  isPro,
  onUpgrade,
}: {
  subscriptions: Subscription[]
  isPro: boolean
  onUpgrade: () => void
}) {
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      const year = d.getFullYear()
      const monthIndex = d.getMonth()
      const amount = subscriptions
        .filter((s) => wasActiveInMonth(s, year, monthIndex))
        .reduce((sum, s) => sum + monthlyAmount(s), 0)
      return { year, monthIndex, amount }
    })
  }, [subscriptions])

  const currentMonth = months[months.length - 1]
  const maxAmount = Math.max(...months.map((m) => m.amount), 1)
  const stepX = (WIDTH - PADDING * 2) / (months.length - 1)

  const points = months.map((m, i) => ({
    x: PADDING + i * stepX,
    y: HEIGHT - PADDING - (m.amount / maxAmount) * (HEIGHT - PADDING * 2),
    ...m,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING} L ${points[0].x} ${HEIGHT - PADDING} Z`

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4.5 shadow-lg backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">Vývoj výdajů</h3>
        <span className="text-[11px] font-mono font-bold text-white/60">
          Měsíční útrata: {Math.round(currentMonth.amount).toLocaleString('cs-CZ')} Kč
        </span>
      </div>

      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} height={HEIGHT} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendsAreaGrad)" />
          <path d={linePath} fill="none" stroke="#ec4899" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle
              key={`${p.year}-${p.monthIndex}`}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 3.5 : 2}
              fill={i === points.length - 1 ? '#ec4899' : 'rgba(236,72,153,0.5)'}
            />
          ))}
        </svg>

        <div className="flex justify-between mt-1 px-1">
          {months.map((m, i) => (
            <span
              key={`${m.year}-${m.monthIndex}`}
              className={`text-[8px] ${i === months.length - 1 ? 'text-white font-bold' : 'text-white/40'}`}
            >
              {MONTH_LABELS[m.monthIndex]}
            </span>
          ))}
        </div>

        {!isPro && (
          <div
            className="absolute inset-y-0 left-0 flex flex-col items-center justify-center rounded-xl px-3"
            style={{ width: '82%', background: 'rgba(8,3,19,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <p className="text-center text-xs font-bold text-white/90 mb-2">Odemkni historii za 12 měsíců</p>
            <button
              onClick={onUpgrade}
              className="rounded-xl theme-accent-btn px-4 py-1.5 text-xs font-black whitespace-nowrap"
            >
              Odemknout trendy → Pro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
