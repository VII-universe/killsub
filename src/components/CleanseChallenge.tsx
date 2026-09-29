'use client'

import { useEffect, useState } from 'react'
import {
  CleanseState,
  getCleanseState,
  getCleanseDaysRemaining,
  startCleanse,
  stopCleanse,
  CLEANSE_UPDATED_EVENT,
} from '@/utils/cleanse'

export default function CleanseChallenge() {
  const [state, setState] = useState<CleanseState | null>(null)

  useEffect(() => {
    setState(getCleanseState())
    const handleUpdate = () => setState(getCleanseState())
    window.addEventListener(CLEANSE_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(CLEANSE_UPDATED_EVENT, handleUpdate)
  }, [])

  const daysRemaining = state ? getCleanseDaysRemaining(state) : 0

  // Auto-ends the challenge once the 30 days are up.
  useEffect(() => {
    if (state?.active && daysRemaining <= 0) {
      setState(stopCleanse())
    }
  }, [state, daysRemaining])

  if (!state) return null

  if (!state.active) {
    return (
      <button
        onClick={() => setState(startCleanse())}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-white/15 bg-white/[0.03] py-3.5 px-5 text-sm font-black text-white hover:bg-white/[0.07] active:scale-[0.98] transition-all"
      >
        <span>Spustit 30denní výzvu</span>
        <span>💀</span>
      </button>
    )
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-rose-950/30 to-purple-950/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-white">💀 Subscription Cleanse</p>
          <p className="mt-0.5 text-[11px] text-white/60">
            {daysRemaining} {daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'} zbývá · Zrušil jsi{' '}
            <span className="font-black text-white">{state.cancelled.length}</span>{' '}
            {state.cancelled.length === 1 ? 'předplatné' : 'předplatných'}
          </p>
        </div>
        <button
          onClick={() => setState(stopCleanse())}
          className="flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/70 hover:bg-white/10"
        >
          Ukončit
        </button>
      </div>
    </div>
  )
}
