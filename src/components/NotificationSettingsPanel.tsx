'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationState,
} from '@/app/actions/notifications'

export default function NotificationSettingsPanel() {
  const [enabled, setEnabled] = useState(false)
  const [daysBefore, setDaysBefore] = useState<3 | 7 | 14>(3)
  const [loaded, setLoaded] = useState(false)
  const [state, formAction, isPending] = useActionState<NotificationState | null, FormData>(
    updateNotificationSettings,
    null
  )

  useEffect(() => {
    getNotificationSettings().then((settings) => {
      setEnabled(settings.enabled)
      setDaysBefore(settings.days_before)
      setLoaded(true)
    })
  }, [])

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded" />
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white">E-mail před obnovou předplatného</p>
          <p className="text-[11px] text-white/50 mt-0.5">Dostanete upozornění před strhnutím platby.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-white/10 peer-checked:bg-[var(--accent-primary)] rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {enabled && (
        <div>
          <p className="text-[11px] font-bold text-white/70 mb-2">Upozornit kolik dní předem</p>
          <div className="flex gap-2">
            {([3, 7, 14] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysBefore(d)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  daysBefore === d
                    ? 'theme-accent-btn'
                    : 'border border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {d} dní
              </button>
            ))}
          </div>
          <input type="hidden" name="days_before" value={daysBefore} />
        </div>
      )}

      {state?.error && <p className="text-[11px] text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-[11px] text-emerald-300">Nastavení uloženo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl theme-accent-btn py-2.5 text-xs font-black disabled:opacity-50"
      >
        {isPending ? 'Ukládám...' : 'Uložit nastavení'}
      </button>
    </form>
  )
}
