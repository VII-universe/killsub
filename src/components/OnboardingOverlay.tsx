'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import { markOnboarded } from '@/app/actions/profile'

function monthlyAmount(sub: Subscription): number {
  const amt = Number(sub.amount) || 0
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

export default function OnboardingOverlay({
  subscriptions,
  onboarded,
  onOpenAddModal,
}: {
  subscriptions: Subscription[]
  onboarded: boolean
  onOpenAddModal: () => void
}) {
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!onboarded && subscriptions.length === 0) {
      setActive(true)
    }
    setLoaded(true)
    // Only the mount-time state decides whether the wizard starts — intentionally
    // not re-evaluated if `onboarded`/subscriptions change for other reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = () => {
    setActive(false)
    markOnboarded()
  }

  if (!loaded || !active) return null

  const step = subscriptions.length === 0 ? 'choice' : 'summary'
  const totalMonthly = subscriptions.reduce((sum, s) => sum + monthlyAmount(s), 0)
  const currency = subscriptions[0]?.currency || 'CZK'

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
        {step === 'choice' && (
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
              <span style={{ fontSize: 32 }}>👋</span>
            </div>
            <h2 className="mt-5" style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>
              Vítej v Killsub!
            </h2>
            <p className="mt-2" style={{ fontSize: 14, color: '#8b8fa8', lineHeight: 1.5 }}>
              Jak chceš přidat svá první předplatná?
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
              ✍️ Přidat předplatné ručně
            </button>

            <Link
              href="/dashboard/import"
              className="w-full flex items-center justify-center mt-2.5 active:scale-[0.98] transition-transform"
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#e8eaf0',
                borderRadius: 14,
                padding: 15,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              🏦 Naskenovat bankovní výpis
            </Link>

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

        {step === 'summary' && (
          <div className="flex flex-col items-center text-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <span style={{ fontSize: 32 }}>🎉</span>
            </div>
            <h2 className="mt-5" style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0' }}>
              Hotovo! Tady je tvůj přehled.
            </h2>
            <p className="mt-2" style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.5 }}>
              Celková měsíční útrata
            </p>
            <p className="text-gradient-stat" style={{ fontSize: 40, fontWeight: 800, marginTop: 4 }}>
              {Math.round(totalMonthly).toLocaleString('cs-CZ')} {currency}
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: '#5a5e72' }}>
              {subscriptions.length} {subscriptions.length === 1 ? 'předplatné' : 'předplatných'}
            </p>

            <button
              type="button"
              onClick={finish}
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
              Pokračovat →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
