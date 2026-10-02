import { Subscription } from './SubscriptionList'

const BAR_WIDTH = 32
const GAP = 12
const MAX_HEIGHT = 80

const MONTH_LABELS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

function monthlyAmount(sub: Subscription): number {
  const amt = Number(sub.amount) || 0
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

// Same logic as WrappedView's wasActiveInMonth — a subscription without a
// created_at is treated as always active, otherwise active from its creation
// month onward.
function wasActiveInMonth(sub: Subscription, year: number, monthIndex: number): boolean {
  if (!sub.created_at) return true
  const created = new Date(sub.created_at)
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
  return created <= monthEnd
}

export default function SpendingTrends({ subscriptions }: { subscriptions: Subscription[] }) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const year = d.getFullYear()
    const monthIndex = d.getMonth()
    const amount = subscriptions
      .filter((s) => wasActiveInMonth(s, year, monthIndex))
      .reduce((sum, s) => sum + monthlyAmount(s), 0)
    return { year, monthIndex, amount }
  })

  const maxAmount = Math.max(...months.map((m) => m.amount), 1)
  const avg = months.reduce((sum, m) => sum + m.amount, 0) / months.length
  const last = months[months.length - 1].amount
  const prev = months[months.length - 2]?.amount ?? last
  const trendPct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0
  const trendUp = last >= prev

  const svgWidth = months.length * BAR_WIDTH + (months.length - 1) * GAP
  const svgHeight = MAX_HEIGHT + 22

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4">Vývoj výdajů</h3>

      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        height={svgHeight}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {months.map((m, idx) => {
          const barHeight = Math.max((m.amount / maxAmount) * MAX_HEIGHT, 2)
          const x = idx * (BAR_WIDTH + GAP)
          const y = MAX_HEIGHT - barHeight
          const isLast = idx === months.length - 1
          return (
            <g key={`${m.year}-${m.monthIndex}`}>
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barHeight}
                rx={6}
                fill="url(#trendGradient)"
                opacity={isLast ? 1 : 0.55}
              />
              <text
                x={x + BAR_WIDTH / 2}
                y={MAX_HEIGHT + 16}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.5)"
              >
                {MONTH_LABELS[m.monthIndex]}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-white/60">
          Průměrně <strong className="text-white">{Math.round(avg).toLocaleString('cs-CZ')} Kč</strong>/měs.
        </span>
        <span className={`font-bold ${trendUp ? 'text-rose-400' : 'text-emerald-400'}`}>
          Trend: {trendUp ? '↑' : '↓'} {Math.abs(trendPct)}% oproti minulému měsíci
        </span>
      </div>
    </div>
  )
}
