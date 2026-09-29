'use client'

import { useState } from 'react'
import { UserProfileData, PRO_PRICE_MONTHLY_CZK, PRO_PRICE_YEARLY_CZK } from '@/utils/plan'
import UpgradeModal from './UpgradeModal'

export default function PlanSettingsPanel({ profile }: { profile: UserProfileData | null }) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const isPro = profile?.plan === 'pro'

  const openPortal = async () => {
    setIsLoadingPortal(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Nepodařilo se otevřít správu předplatného.')
      window.location.href = data.url
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : 'Nastala chyba.')
      setIsLoadingPortal(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white">Můj plán</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {isPro ? 'Killsub Pro — neomezená předplatná a AI import' : 'Free — max 5 předplatných'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
            isPro
              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
              : 'bg-white/5 text-white/60 border-white/10'
          }`}
        >
          {isPro ? 'Pro' : 'Free'}
        </span>
      </div>

      {isPro ? (
        <div className="space-y-2">
          {profile?.planExpiresAt && (
            <p className="text-[11px] text-white/50">
              Aktivní do {new Date(profile.planExpiresAt).toLocaleDateString('cs-CZ')}
            </p>
          )}
          {portalError && <p className="text-[11px] text-rose-300">{portalError}</p>}
          <button
            onClick={openPortal}
            disabled={isLoadingPortal}
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50"
          >
            {isLoadingPortal ? 'Otevírám...' : 'Spravovat předplatné →'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowUpgrade(true)}
          className="w-full rounded-xl theme-accent-btn py-2.5 text-xs font-black"
        >
          Přejít na Pro → ({PRO_PRICE_MONTHLY_CZK} Kč/měs. nebo {PRO_PRICE_YEARLY_CZK} Kč/rok)
        </button>
      )}

      {showUpgrade && (
        <UpgradeModal
          message="Neomezená předplatná, Gemini AI import faktur, e-mailové notifikace a cashflow kalendář."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}
