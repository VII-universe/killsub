'use client'

import { effectiveAmount } from '@/utils/subscriptionCost'
import { Subscription } from './SubscriptionList'

function monthlyAmount(sub: Subscription): number {
  const amt = effectiveAmount(sub)
  return sub.billing_cycle === 'yearly' ? amt / 12 : amt
}

export default function TaxShieldSection({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.status !== 'cancelled')

  const businessMonthly = active
    .filter((s) => s.tax_category === 'business')
    .reduce((sum, s) => sum + monthlyAmount(s), 0)

  const personalMonthly = active
    .filter((s) => s.tax_category === 'personal')
    .reduce((sum, s) => sum + monthlyAmount(s), 0)

  const unclassifiedCount = active.filter((s) => !s.tax_category).length

  if (active.length === 0) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">🛡️ Daňový přehled</h3>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Firemní</p>
          <p className="mt-1 text-sm font-black text-white">
            {Math.round(businessMonthly).toLocaleString('cs-CZ')} Kč/měs.
          </p>
          <p className="text-[10px] text-white/50">{Math.round(businessMonthly * 12).toLocaleString('cs-CZ')} Kč/rok</p>
        </div>
        <div className="rounded-2xl border border-slate-400/30 bg-slate-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Osobní</p>
          <p className="mt-1 text-sm font-black text-white">
            {Math.round(personalMonthly).toLocaleString('cs-CZ')} Kč/měs.
          </p>
          <p className="text-[10px] text-white/50">{Math.round(personalMonthly * 12).toLocaleString('cs-CZ')} Kč/rok</p>
        </div>
      </div>

      {unclassifiedCount > 0 && (
        <p className="mt-3 text-[11px] text-white/60">
          Máš {unclassifiedCount} neroztříděných předplatných. Označ firemní pro daňový export →
        </p>
      )}

      <a
        href="/api/export/tax-report"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl theme-accent-btn py-3 px-4 text-xs font-black tracking-wide shadow-xl active:scale-[0.98]"
      >
        Exportovat pro účetní (PDF)
      </a>
    </div>
  )
}
