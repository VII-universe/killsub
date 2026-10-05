'use client'

import { findCancelLink } from '@/utils/cancelLinks'

function yearlyEquivalentPhrase(yearlyAmount: number): string {
  if (yearlyAmount < 500) return 'pár dobrých káv ☕'
  if (yearlyAmount < 2000) return 'výlet na víkend 🏕️'
  if (yearlyAmount < 5000) return 'nový telefon 📱'
  if (yearlyAmount <= 15000) return 'letenku do Evropy ✈️'
  return 'dovolenou v zahraničí 🌍'
}

export default function CancellationCelebration({
  subscriptionName,
  monthlyAmount,
  currency,
  onClose,
}: {
  subscriptionName: string
  monthlyAmount: number
  currency: string
  onClose: () => void
}) {
  const roundedMonthly = Math.round(monthlyAmount)
  const yearlyAmount = roundedMonthly * 12
  const cancelLink = findCancelLink(subscriptionName)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="celebration-backdrop absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="celebration-modal relative z-10 w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-7 text-center shadow-2xl">
        <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20">
          <circle
            className="celebration-check-circle"
            cx="26"
            cy="26"
            r="25"
            fill="none"
            stroke="url(#celebration-gradient)"
            strokeWidth="2.5"
          />
          <path
            className="celebration-check-mark"
            fill="none"
            stroke="url(#celebration-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
          <defs>
            <linearGradient id="celebration-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        <h2 className="mt-4 text-xl font-black text-white">Skvělé! 🎉</h2>

        <p className="mt-3 text-sm text-white/80 leading-relaxed">
          Právě jsi zrušil <strong className="text-white">{subscriptionName}</strong>. Ušetříš{' '}
          <strong className="text-emerald-300">
            {roundedMonthly.toLocaleString('cs-CZ')} {currency}
          </strong>{' '}
          měsíčně.
        </p>

        <p className="mt-2 text-xs text-white/60 leading-relaxed">
          Za rok to dělá{' '}
          <strong className="text-white/80">
            {yearlyAmount.toLocaleString('cs-CZ')} {currency}
          </strong>{' '}
          — dost na {yearlyEquivalentPhrase(yearlyAmount)}.
        </p>

        {cancelLink && (
          <a
            href={cancelLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
          >
            Nezapomeň zrušit na stránkách {subscriptionName} →
          </a>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex w-full items-center justify-center rounded-2xl theme-accent-btn py-3 px-4 text-xs font-black tracking-wide shadow-xl active:scale-[0.98]"
        >
          Hotovo
        </button>
      </div>
    </div>
  )
}
