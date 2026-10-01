'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const ONBOARDING_DONE_KEY = 'ks_onboarding_done'

export default function OnboardingOverlay({
  subscriptionsCount,
  onOpenAddModal,
}: {
  subscriptionsCount: number
  onOpenAddModal: () => void
}) {
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
    if (!done && subscriptionsCount === 0) {
      setActive(true)
    }
    setLoaded(true)
    // Only the mount-time subscription count decides whether onboarding starts —
    // intentionally not re-evaluated as subscriptionsCount changes afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true')
    } catch {
      // ignore storage failures
    }
    setActive(false)
  }

  if (!loaded || !active) return null

  const step = subscriptionsCount === 0 ? 'welcome' : subscriptionsCount < 3 ? 'step2' : 'step3'
  const filledDots = Math.min(subscriptionsCount, 3)

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-6 animate-in fade-in duration-300"
      style={{ background: 'rgba(10,11,15,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full animate-in zoom-in-95 fade-in duration-300 ease-out"
        style={{
          maxWidth: 360,
          background: '#13151f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: 32,
        }}
      >
        {step === 'welcome' && (
          <div className="flex flex-col items-center text-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, rgba(108,71,255,0.25), rgba(61,155,255,0.15))',
                border: '1px solid rgba(108,71,255,0.3)',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8b6fff" strokeWidth={1.8}>
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path strokeLinecap="round" d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
              </svg>
            </div>
            <h2 className="mt-5" style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>Vítej v Killsub</h2>
            <p className="mt-2" style={{ fontSize: 14, color: '#8b8fa8', lineHeight: 1.5 }}>
              Zjisti co opravdu platíš, přestaň platit za to, co nevyužíváš.
            </p>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="save-cta-btn w-full text-white mt-6 active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 14,
                padding: 15,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 4px 24px rgba(108,71,255,0.4)',
              }}
            >
              Přidat první předplatné →
            </button>
            <button
              type="button"
              onClick={finish}
              className="mt-4"
              style={{ fontSize: 13, color: '#5a5e72', background: 'transparent' }}
            >
              Přeskočit prozatím
            </button>
          </div>
        )}

        {step === 'step2' && (
          <div className="flex flex-col items-center text-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <svg width="30" height="30" viewBox="0 0 28 28" fill="none" stroke="#22c55e" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l4.5 4.5L21 9" />
              </svg>
            </div>
            <h2 className="mt-5" style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>Skvělé! Přidáno.</h2>
            <p className="mt-2" style={{ fontSize: 14, color: '#8b8fa8', lineHeight: 1.5 }}>
              Čím více předplatných přidáš, tím přesnější analýzu dostaneš. Přidej aspoň 3.
            </p>
            <div className="flex items-center gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: i < filledDots ? '#22c55e' : 'rgba(255,255,255,0.14)',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="save-cta-btn w-full text-white mt-6 active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 14,
                padding: 15,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 4px 24px rgba(108,71,255,0.4)',
              }}
            >
              Přidat další →
            </button>
            <button
              type="button"
              onClick={finish}
              className="mt-4"
              style={{ fontSize: 13, color: '#5a5e72', background: 'transparent' }}
            >
              Jsem hotov →
            </button>
          </div>
        )}

        {step === 'step3' && (
          <div className="flex flex-col items-center text-center">
            <div
              className="save-banner-icon relative flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: 'rgba(108,71,255,0.2)',
                border: '1px solid rgba(108,71,255,0.35)',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="onboarding-sparkle-grad" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#6c47ff" />
                    <stop offset="100%" stopColor="#3d9bff" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"
                  fill="url(#onboarding-sparkle-grad)"
                />
                <path d="M19 14l0.8 2.3L22 17l-2.2 0.7L19 20l-0.8-2.3L16 17l2.2-0.7L19 14z" fill="rgba(255,255,255,0.6)" />
              </svg>
            </div>
            <h2 className="mt-5" style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>
              Máš dost dat pro analýzu!
            </h2>
            <p className="mt-2" style={{ fontSize: 14, color: '#8b8fa8', lineHeight: 1.5 }}>
              Teď zjisti kde platíš zbytečně.
            </p>
            <Link
              href="/save"
              onClick={finish}
              className="save-cta-btn w-full text-white mt-6 flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
                borderRadius: 14,
                padding: 15,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 4px 24px rgba(108,71,255,0.4)',
              }}
            >
              Zobrazit analýzu →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
