'use client'

import { useMemo } from 'react'
import { Subscription } from './SubscriptionList'

interface QuickSuggestion {
  name: string
  amount: string
  currency: string
  priceLabel: string
  color: string
  initial: string
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { name: 'Netflix', amount: '259', currency: 'CZK', priceLabel: '259 Kč', color: '#e50914', initial: 'N' },
  { name: 'Spotify', amount: '169', currency: 'CZK', priceLabel: '169 Kč', color: '#1db954', initial: 'S' },
  { name: 'iCloud+', amount: '79', currency: 'CZK', priceLabel: '79 Kč', color: '#555555', initial: '☁' },
  { name: 'YouTube Premium', amount: '179', currency: 'CZK', priceLabel: '179 Kč', color: '#ff0000', initial: '▶' },
  { name: 'ChatGPT Plus', amount: '20', currency: 'USD', priceLabel: '$20', color: '#1a7a52', initial: 'AI' },
  { name: 'Claude Pro', amount: '20', currency: 'USD', priceLabel: '$20', color: '#6c47ff', initial: 'C' },
]

export default function MobileAIHeroCard({
  onOpenForm,
  onOpenAiImport,
  isPro,
  subscriptions = [],
  onQuickAdd,
}: {
  onOpenForm: () => void
  onOpenAiImport: () => void
  isPro: boolean
  subscriptions?: Subscription[]
  onQuickAdd?: (item: { name: string; amount: string; currency: string; billing_cycle: string }) => void
}) {
  const { count, monthlyLabel, yearlyLabel } = useMemo(() => {
    if (!subscriptions.length) {
      return { count: '—', monthlyLabel: '—', yearlyLabel: '—' }
    }

    const monthlyTotal = subscriptions.reduce((sum, s) => {
      const amt = Number(s.amount) || 0
      return sum + (s.billing_cycle === 'yearly' ? amt / 12 : amt)
    }, 0)

    return {
      count: String(subscriptions.length),
      monthlyLabel: `${Math.round(monthlyTotal).toLocaleString('cs-CZ')} Kč`,
      yearlyLabel: `${Math.round(monthlyTotal * 12).toLocaleString('cs-CZ')} Kč`,
    }
  }, [subscriptions])

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border"
      style={{ background: '#1a1d27', borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 }}
    >
      {/* Animated ambient blobs */}
      <div
        className="animate-hero-drift-1 pointer-events-none absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          top: -80,
          left: -40,
          background: 'radial-gradient(circle, #6c47ff, transparent 70%)',
          opacity: 0.35,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="animate-hero-drift-2 pointer-events-none absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          top: -60,
          right: 20,
          background: 'radial-gradient(circle, #3d9bff, transparent 70%)',
          opacity: 0.22,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="animate-hero-drift-3 pointer-events-none absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          bottom: 10,
          left: '30%',
          background: 'radial-gradient(circle, #a855f7, transparent 70%)',
          opacity: 0.13,
          filter: 'blur(40px)',
        }}
      />

      {/* Rotating sparkle icon */}
      <div className="animate-hero-spin-slow pointer-events-none absolute z-[2]" style={{ top: 18, right: 18, width: 44, height: 44 }}>
        <svg viewBox="0 0 44 44" fill="none" width={44} height={44}>
          <circle cx="22" cy="22" r="21" fill="rgba(108,71,255,0.1)" stroke="rgba(108,71,255,0.25)" />
          <path d="M22 10 L23.8 19.2 L33 21 L23.8 22.8 L22 32 L20.2 22.8 L11 21 L20.2 19.2 Z" fill="url(#gstar)" />
          <circle cx="31" cy="13" r="1.8" fill="rgba(108,71,255,0.6)" />
          <circle cx="14" cy="30" r="1.3" fill="rgba(61,155,255,0.5)" />
          <defs>
            <linearGradient id="gstar" x1="11" y1="10" x2="33" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6c47ff" />
              <stop offset="100%" stopColor="#3d9bff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Inner content */}
      <div className="relative z-[1]" style={{ padding: '24px 20px 20px' }}>
        {/* Badge pill */}
        <div
          className="inline-flex items-center rounded-full"
          style={{
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(108,71,255,0.15)',
            border: '1px solid rgba(108,71,255,0.35)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#8b6fff',
            marginBottom: 14,
          }}
        >
          <span className="animate-hero-badge-pulse rounded-full" style={{ width: 6, height: 6, background: '#8b6fff' }} />
          <span>AI asistent</span>
        </div>

        {/* Headline */}
        <h2 className="text-gradient-hero" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, marginBottom: 8 }}>
          Mám pod kontrolou každé tvé předplatné
        </h2>

        {/* Subtext */}
        <p style={{ fontSize: 13, color: '#8b8fa8', lineHeight: 1.55, marginBottom: 20, maxWidth: 270 }}>
          Nahraj fakturu nebo e-mail — vyplním vše za tebe. Nebo přidej ručně za 10 sekund.
        </p>

        {/* Stats row */}
        <div
          className="flex items-stretch"
          style={{ gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="text-gradient-stat" style={{ fontSize: 20, fontWeight: 700 }}>{count}</span>
            <span style={{ fontSize: 11, color: '#5a5e72', fontWeight: 500 }}>Aktivní</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="text-gradient-stat" style={{ fontSize: 20, fontWeight: 700 }}>{monthlyLabel}</span>
            <span style={{ fontSize: 11, color: '#5a5e72', fontWeight: 500 }}>Měsíčně</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="text-gradient-stat" style={{ fontSize: 20, fontWeight: 700 }}>{yearlyLabel}</span>
            <span style={{ fontSize: 11, color: '#5a5e72', fontWeight: 500 }}>Ročně</span>
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex" style={{ gap: 10 }}>
          <button
            onClick={onOpenAiImport}
            className="flex flex-1 items-center justify-center text-white transition-transform active:scale-[0.98]"
            style={{
              gap: 8,
              padding: '13px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6c47ff, #3d9bff)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isPro ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
              </svg>
            ) : (
              <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            <span>AI Import</span>
          </button>

          <button
            onClick={onOpenForm}
            className="flex flex-1 items-center justify-center transition-transform active:scale-[0.98]"
            style={{
              gap: 8,
              padding: '13px 16px',
              borderRadius: 12,
              background: '#22263a',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e8eaf0',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Přidat ručně</span>
          </button>
        </div>
      </div>

      {/* Quick suggestions row */}
      <div className="relative z-[1]" style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#5a5e72', marginBottom: 10, textTransform: 'uppercase' }}>
          Rychlé přidání
        </p>
        <div className="flex overflow-x-auto scrollbar-none" style={{ gap: 8 }}>
          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item.name}
              onClick={() =>
                onQuickAdd?.({
                  name: item.name,
                  amount: item.amount,
                  currency: item.currency,
                  billing_cycle: 'monthly',
                })
              }
              className="flex flex-shrink-0 items-center rounded-full transition-transform active:scale-95"
              style={{
                gap: 7,
                padding: '7px 12px 7px 7px',
                background: '#1a1d27',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="flex flex-shrink-0 items-center justify-center rounded-full text-white"
                style={{ width: 22, height: 22, background: item.color, fontSize: 10, fontWeight: 700 }}
              >
                {item.initial}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e8eaf0', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ fontSize: 11, color: '#5a5e72', whiteSpace: 'nowrap' }}>{item.priceLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
