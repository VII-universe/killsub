'use client'

import PortfolioScoreCard from '@/components/PortfolioScoreCard'
import CashflowCalendar from '@/components/CashflowCalendar'
import { DEMO_SUBSCRIPTIONS } from '@/utils/demoData'

/** Real app widgets rendered with the app's own sample data, inside the landing's palette. No network, no auth. */
export function ScoreFrame() {
  return (
    <div className="mk-app-frame">
      <PortfolioScoreCard subscriptions={DEMO_SUBSCRIPTIONS} />
    </div>
  )
}

export function CalendarFrame() {
  return (
    <div className="mk-app-frame">
      <CashflowCalendar subscriptions={DEMO_SUBSCRIPTIONS} />
    </div>
  )
}
