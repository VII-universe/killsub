'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  CleanseState,
  CLEANSE_DURATION_DAYS,
  getCleanseState,
  getCleanseDaysRemaining,
  getCleanseDaysElapsed,
  startCleanse,
  stopCleanse,
  CLEANSE_UPDATED_EVENT,
} from '@/utils/cleanse'

export default function CleanseChallenge() {
  const [state, setState] = useState<CleanseState | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setState(getCleanseState())
    const handleUpdate = () => setState(getCleanseState())
    window.addEventListener(CLEANSE_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(CLEANSE_UPDATED_EVENT, handleUpdate)
  }, [])

  const daysRemaining = state ? getCleanseDaysRemaining(state) : 0
  const daysElapsed = state ? getCleanseDaysElapsed(state) : 0

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

  const progress = daysElapsed / CLEANSE_DURATION_DAYS
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  const handleCardTap = () => {
    if (daysElapsed <= 0) {
      setToast('Výzva teprve začíná! 💪')
      setTimeout(() => setToast(null), 2500)
      return
    }

    confetti({
      particleCount: 80,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#6c47ff', '#a855f7', '#3d9bff', '#22c55e', '#f59e0b', '#ec4899'],
    })
  }

  return (
    <div
      onClick={handleCardTap}
      className="relative overflow-hidden cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #1a1020, #0f1117)',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: 16,
        padding: '16px 18px',
      }}
    >
      {/* Subtle purple glow behind the skull */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 160,
          height: 160,
          top: -60,
          left: -60,
          background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
        }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center" style={{ marginRight: 12 }}>
          <span style={{ fontSize: 28, marginRight: 12 }}>💀</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>Subscription Cleanse</p>
            <p className="mt-0.5 flex items-center" style={{ fontSize: 12, color: '#8b8fa8' }}>
              <span>{daysRemaining} dní zbývá</span>
              <span className="mx-1.5">·</span>
              <span style={{ color: '#a855f7', fontWeight: 600 }}>
                Zrušil jsi {state.cancelled.length} {state.cancelled.length === 1 ? 'předplatné' : 'předplatných'}
              </span>
            </p>
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
          <svg className="-rotate-90" width={44} height={44} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="#a855f7"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaf0' }}>{daysRemaining}</span>
            <span style={{ fontSize: 8, color: '#8b8fa8' }}>dní</span>
          </div>
        </div>
      </div>

      <div className="relative flex justify-end" style={{ marginTop: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setState(stopCleanse())
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 11,
            color: '#5a5e72',
          }}
        >
          Ukončit výzvu
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-xs font-black text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
