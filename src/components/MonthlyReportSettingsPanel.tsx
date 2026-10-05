'use client'

import { useState } from 'react'

export default function MonthlyReportSettingsPanel({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleToggle = async (next: boolean) => {
    setEnabled(next)
    setIsSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_report_enabled: next }),
      })
      if (!res.ok) {
        setEnabled(!next)
        setMessage('Nepodařilo se uložit nastavení.')
      }
    } catch {
      setEnabled(!next)
      setMessage('Nepodařilo se uložit nastavení.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white">Zasílat měsíční přehled e-mailem</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            Na začátku měsíce dostaneš souhrn svých předplatných a kolik tě stojí.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isSaving}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-white/10 peer-checked:bg-[var(--accent-primary)] rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </label>
      </div>
      {message && <p className="mt-2 text-[11px] text-rose-300">{message}</p>}
    </div>
  )
}
