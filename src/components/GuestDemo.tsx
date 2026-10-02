'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SUBSCRIPTION_CATALOG } from '@/utils/catalog'

interface GuestSubscription {
  name: string
  price: number
  billing_cycle: 'monthly' | 'yearly'
}

const MAX_GUEST_SUBSCRIPTIONS = 3

function trackGuestEvent(event: string) {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {
    // best-effort — never block the demo flow over a tracking error
  })
}

export default function GuestDemo() {
  const [subs, setSubs] = useState<GuestSubscription[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [error, setError] = useState<string | null>(null)

  const atLimit = subs.length >= MAX_GUEST_SUBSCRIPTIONS

  const monthlyTotal = subs.reduce((sum, s) => sum + (s.billing_cycle === 'yearly' ? s.price / 12 : s.price), 0)
  const yearlyTotal = subs.reduce((sum, s) => sum + (s.billing_cycle === 'yearly' ? s.price : s.price * 12), 0)

  const handleCatalogSelect = (catalogName: string) => {
    const item = SUBSCRIPTION_CATALOG.find((i) => i.name === catalogName)
    if (!item) return
    setName(item.name)
    setPrice(String(item.defaultAmount))
    setBillingCycle(item.billing_cycle)
  }

  const handleAdd = () => {
    if (atLimit) return
    const trimmedName = name.trim()
    const parsedPrice = parseFloat(price)

    if (!trimmedName) {
      setError('Zadejte název služby.')
      return
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Zadejte platnou částku větší než 0.')
      return
    }

    setSubs((prev) => [...prev, { name: trimmedName, price: parsedPrice, billing_cycle: billingCycle }])
    setName('')
    setPrice('')
    setBillingCycle('monthly')
    setError(null)
    trackGuestEvent('guest_subscription_added')
  }

  const handleRemove = (idx: number) => {
    setSubs((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'var(--bg-app)', color: 'var(--text-main)', padding: 16 }}
    >
      <div className="w-full max-w-md py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1L9 5.5H14L10 8.5L11.5 13L7 10.2L2.5 13L4 8.5L0 5.5H5L7 1Z" fill="currentColor" />
          </svg>
          Killsub
        </Link>

        <h1 className="mt-6 text-2xl font-black tracking-tight">Kolik platíš za předplatná? 👀</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Přidej svá předplatná a uvidíš okamžitě kolik tě stojí.
        </p>

        {/* Added subscriptions */}
        {subs.length > 0 && (
          <div className="mt-6 space-y-2.5">
            {subs.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border p-3.5"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{sub.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {sub.billing_cycle === 'yearly' ? 'Ročně' : 'Měsíčně'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono font-black text-sm">
                    {sub.price.toLocaleString('cs-CZ')} Kč
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    aria-label="Odebrat"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {!atLimit && (
          <div
            className="mt-6 rounded-2xl border p-4 space-y-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div>
              <label className="block text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                Rychlý výběr z katalogu
              </label>
              <select
                onChange={(e) => handleCatalogSelect(e.target.value)}
                defaultValue=""
                className="select-dark mt-1.5 block w-full text-xs font-bold"
              >
                <option value="" disabled style={{ backgroundColor: '#1a1d27', color: '#e8eaf0' }}>
                  Vyber službu…
                </option>
                {SUBSCRIPTION_CATALOG.map((item) => (
                  <option key={item.name} value={item.name} style={{ backgroundColor: '#1a1d27', color: '#e8eaf0' }}>
                    {item.icon} {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                Název služby
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Netflix"
                className="mt-1.5 block w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-bold text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Cena (Kč)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="259"
                  className="mt-1.5 block w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-black font-mono text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Frekvence
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                  className="select-dark mt-1.5 block w-full text-xs font-bold"
                >
                  <option value="monthly" style={{ backgroundColor: '#1a1d27', color: '#e8eaf0' }}>Měsíčně</option>
                  <option value="yearly" style={{ backgroundColor: '#1a1d27', color: '#e8eaf0' }}>Ročně</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-semibold text-rose-400">{error}</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={atLimit}
              className="w-full rounded-2xl theme-accent-btn py-3 text-xs font-black tracking-wide disabled:opacity-50"
            >
              + Přidat
            </button>
          </div>
        )}

        {/* Live totals */}
        <div
          className="mt-6 rounded-2xl border p-4 flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Celkem měsíčně
            </p>
            <p className="text-xl font-black font-mono">{Math.round(monthlyTotal).toLocaleString('cs-CZ')} Kč</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Ročně
            </p>
            <p className="text-xl font-black font-mono">{Math.round(yearlyTotal).toLocaleString('cs-CZ')} Kč</p>
          </div>
        </div>

        {/* CTA */}
        {atLimit ? (
          <div className="mt-6 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 p-5 text-center">
            <p className="text-sm font-black">Dosáhl jsi limitu demo verze</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              V plné verzi přidáš neomezeně předplatných a dostaneš upozornění před každou platbou.
            </p>
            <Link
              href="/login?next=/dashboard"
              className="mt-4 inline-block w-full rounded-2xl theme-accent-btn py-3 text-xs font-black tracking-wide"
            >
              Zaregistrovat se zdarma →
            </Link>
          </div>
        ) : subs.length > 0 ? (
          <div
            className="mt-6 rounded-2xl border p-4 text-center"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <Link href="/login?next=/dashboard" className="text-sm font-bold text-[var(--accent-primary)]">
              Chceš vidět víc? Zaregistruj se zdarma →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
