'use client'

import { useMemo, useState } from 'react'
import { Subscription } from './SubscriptionList'

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

interface DayPayment {
  sub: Subscription
  date: Date
}

function getOccurrencesInMonth(sub: Subscription, year: number, month: number): Date | null {
  if (!sub.next_payment_date) return null
  const anchor = new Date(sub.next_payment_date)
  const day = anchor.getDate()

  if (sub.billing_cycle === 'yearly') {
    if (anchor.getMonth() !== month) return null
    const lastDay = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(day, lastDay))
  }

  // monthly (or unknown cycle defaults to monthly) — only from the anchor month onward
  if (year < anchor.getFullYear() || (year === anchor.getFullYear() && month < anchor.getMonth())) {
    return null
  }
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

export default function CashflowCalendar({ subscriptions }: { subscriptions: Subscription[] }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const { paymentsByDay, monthTotal, dominantCurrency } = useMemo(() => {
    const map = new Map<number, DayPayment[]>()
    const currencyCounts: Record<string, number> = {}
    let total = 0

    subscriptions.forEach((sub) => {
      const occurrence = getOccurrencesInMonth(sub, year, month)
      if (!occurrence) return
      const dayNum = occurrence.getDate()
      if (!map.has(dayNum)) map.set(dayNum, [])
      map.get(dayNum)!.push({ sub, date: occurrence })
      currencyCounts[sub.currency] = (currencyCounts[sub.currency] || 0) + 1
      total += sub.amount
    })

    const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CZK'
    return { paymentsByDay: map, monthTotal: total, dominantCurrency }
  }, [subscriptions, year, month])

  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Convert Sunday=0..Saturday=6 to Monday-first index 0..6
  const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const goToMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1))
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4.5 shadow-lg backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => goToMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
        >
          ‹
        </button>
        <div className="text-center">
          <h3 className="text-sm font-black text-white">
            {MONTH_NAMES[month]} {year}
          </h3>
          <p className="text-[11px] font-mono font-bold text-[var(--accent-primary)]">
            Celkem {monthTotal.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {dominantCurrency}
          </p>
        </div>
        <button
          onClick={() => goToMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((wd) => (
          <span key={wd} className="text-[10px] font-bold uppercase text-white/40">
            {wd}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />

          const payments = paymentsByDay.get(day) || []
          const cellDate = new Date(year, month, day)
          const isToday = cellDate.getTime() === today.getTime()
          const diffDays = Math.round((cellDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const isUrgent = payments.length > 0 && diffDays >= 0 && diffDays <= 3

          return (
            <div
              key={day}
              className={`relative min-h-[56px] rounded-xl border p-1 text-left transition-all ${
                isUrgent
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : payments.length > 0
                  ? 'border-[var(--border-strong)] bg-[var(--accent-primary)]/10'
                  : 'border-white/5 bg-white/[0.02]'
              } ${isToday ? 'ring-1 ring-white/40' : ''}`}
            >
              <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-white/50'}`}>
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {payments.slice(0, 2).map(({ sub }) => (
                  <div
                    key={sub.id}
                    title={`${sub.name} — ${sub.amount} ${sub.currency}`}
                    className={`truncate rounded px-1 py-px text-[8px] font-bold leading-tight ${
                      isUrgent ? 'bg-rose-500/30 text-rose-200' : 'bg-[var(--accent-primary)]/25 text-white'
                    }`}
                  >
                    {sub.name}
                  </div>
                ))}
                {payments.length > 2 && (
                  <div className="text-[8px] font-bold text-white/50">+{payments.length - 2} další</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
