'use client'

import { useState } from 'react'
import { PRO_PRICE_MONTHLY_CZK, PRO_PRICE_YEARLY_CZK } from '@/utils/plan'

export default function UpgradeModal({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async (interval: 'monthly' | 'yearly') => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Nepodařilo se spustit platbu.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba.')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--accent-primary)]/20 to-purple-500/20 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)] mb-4">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
          </svg>
        </div>

        <h3 className="text-lg font-black text-white">Přejděte na Killsub Pro</h3>
        <p className="mt-2 text-xs text-white/70 leading-relaxed">{message}</p>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/50 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            onClick={() => startCheckout('monthly')}
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-2xl theme-accent-btn py-3 px-4 text-xs font-black disabled:opacity-50"
          >
            <span>Měsíčně</span>
            <span>{PRO_PRICE_MONTHLY_CZK} Kč/měs.</span>
          </button>
          <button
            onClick={() => startCheckout('yearly')}
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 py-3 px-4 text-xs font-black text-white hover:bg-white/10 disabled:opacity-50"
          >
            <span>Ročně</span>
            <span>{PRO_PRICE_YEARLY_CZK} Kč/rok</span>
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          className="mt-3 w-full rounded-2xl py-2.5 text-xs font-bold text-white/50 hover:text-white/80"
        >
          Zrušit
        </button>
      </div>
    </div>
  )
}
