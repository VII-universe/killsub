'use client'

import { useMemo, useState } from 'react'
import DeleteSubscriptionButton from './DeleteSubscriptionButton'
import ServiceLogo from './ServiceLogo'
import { getServiceBrand } from '@/utils/branding'
import { computeHealthScore, getHealthTone } from '@/utils/health'

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'yearly' | string
  next_payment_date: string | null
  category: string
  last_used_at?: string | null
  health_score?: number | null
  health_score_manual?: boolean | null
  logo_url?: string | null
  created_at?: string
}

export default function SubscriptionList({
  subscriptions,
  onOpenAddModal,
  onEdit,
  onLoadDemo,
  readOnly,
}: {
  subscriptions: Subscription[]
  onOpenAddModal?: () => void
  onEdit?: (sub: Subscription) => void
  onLoadDemo?: () => void
  readOnly?: boolean
}) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCycle, setFilterCycle] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount-desc' | 'name'>('date')

  const enrichedSubs = useMemo(() => {
    return subscriptions.map((s) => ({
      ...s,
      brand: getServiceBrand(s.name),
      healthScore: computeHealthScore(s),
    }))
  }, [subscriptions])

  const categories = useMemo(() => {
    const set = new Set<string>()
    enrichedSubs.forEach((s) => set.add(s.category || 'Ostatní'))
    return ['all', ...Array.from(set)]
  }, [enrichedSubs])

  const filteredSubs = useMemo(() => {
    return enrichedSubs
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = filterCategory === 'all' || s.category === filterCategory
        const matchesCycle = filterCycle === 'all' || s.billing_cycle === filterCycle
        return matchesSearch && matchesCategory && matchesCycle
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') {
          const aMonth = a.billing_cycle === 'yearly' ? a.amount / 12 : a.amount
          const bMonth = b.billing_cycle === 'yearly' ? b.amount / 12 : b.amount
          return bMonth - aMonth
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name)
        }
        const aTime = a.next_payment_date ? new Date(a.next_payment_date).getTime() : Infinity
        const bTime = b.next_payment_date ? new Date(b.next_payment_date).getTime() : Infinity
        return aTime - bTime
      })
  }, [enrichedSubs, search, filterCategory, filterCycle, sortBy])

  const getDaysRemaining = (dateString: string | null) => {
    if (!dateString) return null
    const target = new Date(dateString).getTime()
    const now = new Date().setHours(0, 0, 0, 0)
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-4">
      {/* Mobile-Friendly Search & Filter Toolbar */}
      <div className="flex flex-col gap-2.5">
        {/* Search Bar with high readability */}
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat mezi předplatnými..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-10 text-xs font-medium text-white placeholder-white/40 shadow-inner backdrop-blur-xl transition-all focus:border-[var(--accent-primary)] focus:bg-white/[0.07] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/60 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Category Pills (Like UXDA RedDot reference) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                filterCategory === cat
                  ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-md'
                  : 'border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Všechny služby' : cat}
            </button>
          ))}
        </div>

        {/* Secondary filters row (Cycle + Sort) */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Cycle toggle pill */}
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-xs">
            <button
              onClick={() => setFilterCycle('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCycle === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Vše
            </button>
            <button
              onClick={() => setFilterCycle('monthly')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCycle === 'monthly'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Měsíční
            </button>
            <button
              onClick={() => setFilterCycle('yearly')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCycle === 'yearly'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Roční
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur-md focus:outline-none cursor-pointer"
          >
            <option value="date" className="bg-slate-900 text-white">📅 Dle data</option>
            <option value="amount-desc" className="bg-slate-900 text-white">💰 Od nejdražších</option>
            <option value="name" className="bg-slate-900 text-white">🔤 Dle abecedy</option>
          </select>
        </div>
      </div>

      {/* Subscriptions List (Mobile optimized tactile cards) */}
      {filteredSubs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-white/60 border border-white/10 text-2xl">
            ✨
          </div>
          <h4 className="mt-3 text-base font-bold text-white">
            {subscriptions.length === 0 ? 'Zatím žádná předplatná' : 'Nebylo nic nalezeno'}
          </h4>
          <p className="mt-1 text-xs text-white/60 max-w-xs mx-auto">
            {subscriptions.length === 0
              ? 'Začněte přidáním svého prvního předplatného tlačítkem níže nebo využijte AI sken faktur.'
              : 'Zkuste změnit hledaný výraz nebo vybranou kategorii.'}
          </p>
          {subscriptions.length === 0 && (onOpenAddModal || onLoadDemo) && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {onOpenAddModal && (
                <button
                  onClick={onOpenAddModal}
                  className="rounded-xl theme-accent-btn px-4 py-2.5 text-xs font-bold text-white shadow-lg inline-flex items-center gap-2"
                >
                  <span>+ Přidat předplatné</span>
                </button>
              )}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 inline-flex items-center gap-2"
                >
                  <span>✨ Načíst ukázková data</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredSubs.map((sub) => {
            const daysRemaining = getDaysRemaining(sub.next_payment_date)
            const isUrgent = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0
            const isOverdue = daysRemaining !== null && daysRemaining < 0
            const healthTone = getHealthTone(sub.healthScore)
            const isLowHealth = healthTone === 'low'
            const yearlyCost = sub.billing_cycle === 'yearly' ? sub.amount : sub.amount * 12

            return (
              <div
                key={sub.id}
                title={
                  isLowHealth
                    ? `Zvažte zrušení — ušetříte ${Math.round(yearlyCost).toLocaleString('cs-CZ')} ${sub.currency}/rok`
                    : undefined
                }
                className={`group relative flex flex-col justify-between rounded-3xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4.5 shadow-lg backdrop-blur-2xl transition-all duration-200 hover:border-white/20 active:scale-[0.99] ${
                  isLowHealth ? 'border-rose-500/50' : 'border-white/10'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Brand Logo */}
                      <ServiceLogo name={sub.name} size={48} customLogoUrl={sub.logo_url} />

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white leading-tight">
                            {sub.name}
                          </h4>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${sub.brand.badgeBg}`}>
                            {sub.category}
                          </span>
                          <span className="text-[10px] text-white/50">
                            • {sub.billing_cycle === 'yearly' ? 'Ročně' : 'Měsíčně'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(sub)}
                            title="Upravit předplatné"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 hover:text-white"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <DeleteSubscriptionButton
                          id={sub.id}
                          serviceName={sub.name}
                          amount={sub.amount}
                          currency={sub.currency}
                          billingCycle={sub.billing_cycle}
                        />
                      </div>
                    )}
                  </div>

                  {/* Health score badge */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black font-mono border ${
                        healthTone === 'low'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          : healthTone === 'warning'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21s-6.716-4.35-9.428-8.28C.94 10.02 1.52 6.6 4.343 5.02 6.5 3.8 9.06 4.3 12 7.1c2.94-2.8 5.5-3.3 7.657-2.08 2.823 1.58 3.403 5 1.771 7.7C18.716 16.65 12 21 12 21z" />
                      </svg>
                      Zdraví {sub.healthScore}
                    </span>
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3.5">
                    <div>
                      <span className="text-2xl font-black font-mono tracking-tight text-white">
                        {sub.amount.toLocaleString('cs-CZ')}
                      </span>
                      <span className="ml-1 text-xs font-black font-mono text-[var(--accent-primary)]">
                        {sub.currency}
                      </span>
                    </div>

                    {sub.billing_cycle === 'yearly' ? (
                      <span className="text-[11px] font-mono font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        ~{(sub.amount / 12).toFixed(0)} {sub.currency}/měs.
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        ~{(sub.amount * 12).toLocaleString('cs-CZ')} {sub.currency}/rok
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Footer: Next Payment + Due Badge */}
                <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[11px]">
                  <div className="flex items-center gap-1 text-white/60 font-medium">
                    <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {sub.next_payment_date
                        ? new Date(sub.next_payment_date).toLocaleDateString('cs-CZ')
                        : 'Bez data'}
                    </span>
                  </div>

                  {daysRemaining !== null && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono shadow-sm ${
                        isOverdue
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isUrgent
                          ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 animate-pulse'
                          : 'bg-white/10 text-white/90 border border-white/10'
                      }`}
                    >
                      {isOverdue
                        ? 'Splatné'
                        : daysRemaining === 0
                        ? 'Dnes'
                        : daysRemaining === 1
                        ? 'Zítra'
                        : `Za ${daysRemaining} d.`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
