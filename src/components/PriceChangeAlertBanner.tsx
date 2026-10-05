'use client'

import { useState } from 'react'
import { applyPriceChangeAlert, dismissPriceChangeAlert } from '@/app/actions/priceAlerts'
import { findCancelLink } from '@/utils/cancelLinks'

export interface PriceChangeAlert {
  id: string
  subscriptionId: string
  subscriptionName: string
  oldAmount: number
  newAmount: number
  currency: string
  changePercent: number
}

export default function PriceChangeAlertBanner({ alert }: { alert: PriceChangeAlert }) {
  const [isHidden, setIsHidden] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const cancelLink = findCancelLink(alert.subscriptionName)

  if (isHidden) return null

  const handleUpdatePrice = async () => {
    setIsSaving(true)
    const result = await applyPriceChangeAlert(alert.id, alert.subscriptionId, alert.newAmount)
    setIsSaving(false)
    if (result.success) setIsHidden(true)
  }

  const handleDismiss = async () => {
    setIsHidden(true)
    await dismissPriceChangeAlert(alert.id)
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <p className="text-xs font-bold text-orange-300">
          {alert.subscriptionName} zdražil z {alert.oldAmount.toLocaleString('cs-CZ')} {alert.currency} na{' '}
          {alert.newAmount.toLocaleString('cs-CZ')} {alert.currency} (+{alert.changePercent}&nbsp;%). Chceš
          aktualizovat nebo zrušit?
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
        <button
          onClick={handleUpdatePrice}
          disabled={isSaving}
          className="rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1.5 text-[11px] font-bold text-orange-200 hover:bg-orange-500/30 disabled:opacity-50"
        >
          Aktualizovat cenu
        </button>
        {cancelLink && (
          <a
            href={cancelLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-orange-200/80 hover:text-orange-100"
          >
            Jak zrušit →
          </a>
        )}
        <button
          onClick={handleDismiss}
          className="text-[11px] font-semibold text-white/50 hover:text-white/80"
        >
          Zavřít
        </button>
      </div>
    </div>
  )
}
