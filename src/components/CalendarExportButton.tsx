'use client'

import { useState } from 'react'
import { Subscription } from './SubscriptionList'

export default function CalendarExportButton({ subscriptions }: { subscriptions: Subscription[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(subscriptions.map((s) => s.id)))

  const allSelected = selected.size === subscriptions.length

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(subscriptions.map((s) => s.id)))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDownload = () => {
    const url = `/api/calendar/export?ids=${Array.from(selected).join(',')}`
    const a = document.createElement('a')
    a.href = url
    a.download = 'killsub-subscriptions.ics'
    a.click()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Exportovat do kalendáře"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/15 bg-[#120924] p-3 shadow-2xl backdrop-blur-2xl">
            <p className="px-1 pb-2 text-xs font-black text-white">Exportovat do kalendáře</p>

            <label className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5 cursor-pointer border-b border-white/10 mb-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
              />
              <span className="text-xs font-bold text-white">Všechna předplatná</span>
            </label>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {subscriptions.map((sub) => (
                <label
                  key={sub.id}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(sub.id)}
                    onChange={() => toggleOne(sub.id)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
                  />
                  <span className="truncate text-xs text-white/80">{sub.name}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleDownload}
              disabled={selected.size === 0}
              className="mt-3 w-full rounded-xl theme-accent-btn py-2.5 text-xs font-black disabled:opacity-50"
            >
              Stáhnout .ics
            </button>
          </div>
        </>
      )}
    </div>
  )
}
