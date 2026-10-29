'use client'

import PortfolioScoreCard from '@/components/PortfolioScoreCard'
import CashflowCalendar from '@/components/CashflowCalendar'
import { DEMO_SUBSCRIPTIONS } from '@/utils/demoData'
import GuestDemo from '@/components/GuestDemo'
import type { CardData } from './content'
import type { Subscription } from '@/components/SubscriptionList'

/** Real app widgets rendered with the app's own sample data, inside the landing's palette. No network, no auth. */
import { useEffect, useRef, useState } from 'react'

/** Mounts children only once the frame is near the viewport, so the score ring animates in on arrival. */
function useNearViewport(margin = '120px') {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setNear(true); io.disconnect() } }, { rootMargin: `${margin} 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return { ref, near }
}

export function ScoreFrame() {
  const { ref, near } = useNearViewport('-10%')
  return (
    <div className="mk-app-frame mk-app-frame-score" ref={ref} data-tilt>
      {near && <PortfolioScoreCard subscriptions={DEMO_SUBSCRIPTIONS} />}
    </div>
  )
}

/** The landing's sample cards as app subscriptions: the same twelve the hero drops and the column label counts, all monthly, in Kč. */
function cardsAsSubscriptions(cards: CardData[]): Subscription[] {
  const now = new Date()
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0')
  return cards.map((c, i) => ({
    id: `sample-${i}`, user_id: 'sample', name: c.name, amount: c.price, currency: 'Kč', billing_cycle: 'monthly',
    next_payment_date: `${y}-${m}-${String(c.day).padStart(2, '0')}`, category: '', last_used_at: null, health_score: null, health_score_manual: false,
  }))
}

export function CalendarFrame({ cards }: { cards: CardData[] }) {
  return (
    <div className="mk-app-frame" data-assemble="calendar" data-tilt="4">
      <CashflowCalendar subscriptions={cardsAsSubscriptions(cards)} />
    </div>
  )
}

/** The real /try form (GuestDemo) rendered read-only in the landing palette. No network: pointer events are off. */
export function GuestFrame() {
  return (
    <div className="mk-app-frame mk-app-frame-guest" data-tilt aria-hidden="true">
      <div className="mk-app-frame-clip"><GuestDemo /></div>
    </div>
  )
}
