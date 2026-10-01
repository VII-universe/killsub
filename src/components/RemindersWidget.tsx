'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Reminder, dismissReminder, fetchUpcomingReminders } from '@/utils/reminders'

function daysAgo(isoDate: string): number {
  const created = new Date(isoDate).getTime()
  const diffMs = Date.now() - created
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}

export default function RemindersWidget() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchUpcomingReminders().then((data) => {
      setReminders(data)
      setLoaded(true)
    })
  }, [])

  const handleDismiss = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
    await dismissReminder(id)
  }

  if (!loaded || reminders.length === 0) return null

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="flex items-start gap-3"
          style={{
            background: 'rgba(245,158,11,0.06)',
            borderLeft: '4px solid #f59e0b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }} className="flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>{reminder.recommendation_title}</p>
            <p style={{ fontSize: 12, color: '#8b8fa8', marginTop: 2 }}>
              Připomenuto {daysAgo(reminder.created_at)} dní zpět
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <Link
                href="/save"
                className="inline-flex items-center"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Zobrazit analýzu
              </Link>
              <button
                type="button"
                onClick={() => handleDismiss(reminder.id)}
                className="inline-flex items-center"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#8b8fa8',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
