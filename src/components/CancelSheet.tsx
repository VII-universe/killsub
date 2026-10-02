'use client'

import { useState } from 'react'
import ServiceLogo from './ServiceLogo'
import { getCancelInfo } from '@/utils/cancelLinks'
import { Subscription } from './SubscriptionList'

export default function CancelSheet({
  subscription,
  onClose,
  onConfirmCancel,
}: {
  subscription: Subscription
  onClose: () => void
  onConfirmCancel: (id: string) => void
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const cancelInfo = getCancelInfo(subscription.name)

  const handleConfirm = () => {
    setIsConfirming(true)
    onConfirmCancel(subscription.id)
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0b0518] p-6 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Zrušit předplatné</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ServiceLogo name={subscription.name} size={44} customLogoUrl={subscription.logo_url} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{subscription.name}</h3>
            <p className="text-xs text-white/60">
              {subscription.amount.toLocaleString('cs-CZ')} {subscription.currency} ·{' '}
              {subscription.billing_cycle === 'yearly' ? 'Ročně' : 'Měsíčně'} · {subscription.category}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--accent-primary)]">Jak zrušit</h3>

          {cancelInfo ? (
            <>
              <ol className="mt-3 space-y-2.5">
                {cancelInfo.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              <a
                href={cancelInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl theme-accent-btn py-3 px-4 text-xs font-black tracking-wide shadow-xl active:scale-[0.98]"
              >
                Otevřít stránku zrušení →
              </a>
            </>
          ) : (
            <p className="mt-3 text-xs text-white/70 leading-relaxed">
              Navštiv web <strong>{subscription.name}</strong> a najdi sekci Účet → Předplatné.
            </p>
          )}
        </div>

        <div className="my-6 h-px bg-white/10" />

        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white/70">
            Označit jako zrušené v Killsub
          </h3>
          <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
            Označením jako zrušené ho odstraníš z přehledu a přestaneš dostávat připomenutí.
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3 px-4 text-xs font-black text-rose-300 transition-all hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isConfirming ? 'Označuji…' : 'Označit jako zrušené'}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-3 px-4 text-xs font-bold text-white/70 transition-all hover:bg-white/[0.08]"
        >
          Zavřít
        </button>
      </div>
    </div>
  )
}
