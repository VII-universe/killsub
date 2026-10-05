'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BudgetSettingsPanel({ monthlyBudget }: { monthlyBudget: number | null }) {
  const router = useRouter()
  const [value, setValue] = useState(monthlyBudget !== null ? String(monthlyBudget) : '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    const trimmed = value.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setMessage({ type: 'error', text: 'Zadejte platnou částku větší nebo rovnou 0.' })
      setIsSaving(false)
      return
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_budget: parsed }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se uložit rozpočet.')
      }

      setMessage({ type: 'success', text: parsed === null ? 'Rozpočet zrušen.' : 'Rozpočet uložen.' })
      router.refresh()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Nastala chyba.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div>
        <p className="text-xs font-bold text-white">Měsíční rozpočet</p>
        <p className="text-[11px] text-white/50 mt-0.5">
          Nastav si limit na předplatná a uvidíš na dashboardu, jak se k němu blížíš.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="např. 1500"
            className="block w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pr-12 text-xs font-black font-mono text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-white/40">Kč</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl theme-accent-btn px-4 py-2.5 text-xs font-black disabled:opacity-50"
        >
          {isSaving ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>

      {message && (
        <p className={`text-[11px] font-semibold ${message.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
