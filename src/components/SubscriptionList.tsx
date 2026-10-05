'use client'

import { useMemo, useState } from 'react'
import ServiceLogo from './ServiceLogo'
import CancelSheet from './CancelSheet'
import CancellationCelebration from './CancellationCelebration'
import { computeHealthScore, getHealthTone } from '@/utils/health'
import { CATEGORY_COLORS, Category } from '@/utils/categories'
import { cancelSubscription } from '@/app/actions/subscriptions'
import { getCleanseState, recordCleanseCancellation } from '@/utils/cleanse'
import { effectiveAmount } from '@/utils/subscriptionCost'
import { useLanguage } from '@/context/LanguageContext'
import { findCancelLink } from '@/utils/cancelLinks'

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
  note?: string | null
  status?: 'active' | 'cancelled' | 'trial' | null
  shared?: boolean | null
  shared_with?: string | null
  my_share?: number | null
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
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCycle, setFilterCycle] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount-desc' | 'name'>('date')
  const [showCancelled, setShowCancelled] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [celebrationTarget, setCelebrationTarget] = useState<Subscription | null>(null)

  const cancelledCount = subscriptions.filter((s) => s.status === 'cancelled').length

  const handleConfirmCancel = async (id: string) => {
    setIsCancelling(true)
    const result = await cancelSubscription(id)
    if (!result.error && getCleanseState().active) {
      recordCleanseCancellation(id)
    }
    setIsCancelling(false)
    if (!result.error) {
      setCelebrationTarget(cancelTarget)
    }
    setCancelTarget(null)
  }

  const enrichedSubs = useMemo(() => {
    return subscriptions.map((s) => ({
      ...s,
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
        const matchesCancelled = showCancelled || s.status !== 'cancelled'
        return matchesSearch && matchesCategory && matchesCycle && matchesCancelled
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
  }, [enrichedSubs, search, filterCategory, filterCycle, sortBy, showCancelled])

  const getDaysRemaining = (dateString: string | null) => {
    if (!dateString) return null
    // Parse as a local calendar date (not UTC midnight) so it lines up with
    // the local "now" below — otherwise timezones ahead of UTC compute an
    // extra day for dates due today.
    const [year, month, day] = dateString.split('-').map(Number)
    const target = new Date(year, month - 1, day).getTime()
    const now = new Date().setHours(0, 0, 0, 0)
    return Math.round((target - now) / (1000 * 60 * 60 * 24))
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
            placeholder={t('card.searchPlaceholder')}
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
              {cat === 'all' ? t('card.allServices') : cat}
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
              {t('card.cycleAll')}
            </button>
            <button
              onClick={() => setFilterCycle('monthly')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCycle === 'monthly'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t('card.cycleMonthly')}
            </button>
            <button
              onClick={() => setFilterCycle('yearly')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCycle === 'yearly'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t('card.cycleYearly')}
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none rounded-xl border border-white/10 bg-black/40 py-1.5 pl-2.5 pr-7 text-[11px] font-bold text-white/80 backdrop-blur-md focus:outline-none cursor-pointer"
            >
              <option value="date" className="bg-slate-900 text-white">{t('card.sortDate')}</option>
              <option value="amount-desc" className="bg-slate-900 text-white">{t('card.sortAmount')}</option>
              <option value="name" className="bg-slate-900 text-white">{t('card.sortName')}</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {cancelledCount > 0 && (
          <label className="flex items-center gap-2 self-start text-[11px] font-semibold text-white/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
            />
            {t('card.showCancelled', { count: cancelledCount })}
          </label>
        )}
      </div>

      {/* Subscriptions List (Mobile optimized tactile cards) */}
      {filteredSubs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-white/60 border border-white/10 text-2xl">
            ✨
          </div>
          <h4 className="mt-3 text-base font-bold text-white">
            {subscriptions.length === 0 ? t('card.emptyTitleNone') : t('card.emptyTitleNoResults')}
          </h4>
          <p className="mt-1 text-xs text-white/60 max-w-xs mx-auto">
            {subscriptions.length === 0
              ? t('card.emptyBodyNone')
              : t('card.emptyBodyNoResults')}
          </p>
          {subscriptions.length === 0 && (onOpenAddModal || onLoadDemo) && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {onOpenAddModal && (
                <button
                  onClick={onOpenAddModal}
                  className="rounded-xl theme-accent-btn px-4 py-2.5 text-xs font-bold text-white shadow-lg inline-flex items-center gap-2"
                >
                  <span>{t('card.addSubscription')}</span>
                </button>
              )}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 inline-flex items-center gap-2"
                >
                  <span>{t('card.loadDemo')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredSubs.map((sub) => {
            const daysRemaining = getDaysRemaining(sub.next_payment_date)
            const isOverdue = daysRemaining !== null && daysRemaining < 0
            const isCritical = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 1
            const isUrgent = daysRemaining !== null && daysRemaining >= 2 && daysRemaining <= 7
            const hasDueBadge = isOverdue || isCritical || isUrgent
            const healthTone = getHealthTone(sub.healthScore)
            const isLowHealth = healthTone === 'low'
            const effAmount = effectiveAmount(sub)
            const yearlyCost = sub.billing_cycle === 'yearly' ? effAmount : effAmount * 12

            const catColor = CATEGORY_COLORS[sub.category as Category] || '#64748b'
            const isCancelled = sub.status === 'cancelled'
            const isTrial = sub.status === 'trial'
            const cancelLink = isCancelled ? null : findCancelLink(sub.name)

            return (
              <div
                key={sub.id}
                title={
                  isLowHealth
                    ? `Zvažte zrušení — ušetříte ${Math.round(yearlyCost).toLocaleString('cs-CZ')} ${sub.currency}/rok`
                    : undefined
                }
                style={{ borderLeft: `3px solid ${catColor}` }}
                className={`group relative flex flex-col justify-between rounded-3xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-lg backdrop-blur-2xl transition-all duration-200 hover:border-white/20 active:scale-[0.99] ${
                  isCancelled ? 'opacity-50' : isLowHealth ? 'border-rose-500/50' : 'border-white/10'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Brand Logo */}
                      <ServiceLogo name={sub.name} size={48} customLogoUrl={sub.logo_url} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`truncate text-sm font-black leading-tight ${
                              isCancelled ? 'text-white/50 line-through' : 'text-white'
                            }`}
                            title={sub.name}
                          >
                            {sub.name}
                          </h4>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                            style={{
                              backgroundColor: `${catColor}20`,
                              color: catColor,
                              border: `1px solid ${catColor}40`,
                            }}
                          >
                            {sub.category}
                          </span>
                          <span className="text-[10px] text-white/50">
                            • {sub.billing_cycle === 'yearly' ? t('card.cycleYearly') : t('card.cycleMonthly')}
                          </span>
                          {isTrial && (
                            <span className="inline-block rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                              {t('card.trial')}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-block rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/50">
                              {t('card.cancelled')}
                            </span>
                          )}
                          {sub.shared && (
                            <span className="inline-block rounded-md border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-300">
                              {t('card.shared')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!readOnly && !isCancelled && (
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(sub)}
                            title={t('card.editTooltip')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 hover:text-white"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setCancelTarget(sub)}
                          title={t('card.cancelTooltip')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Health score badge */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0 text-[10px] font-black font-mono border ${
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
                      {t('card.health', { score: sub.healthScore })}
                    </span>
                  </div>

                  {sub.note && (
                    <p className="mt-1.5 text-[10px] text-white/50 italic leading-relaxed line-clamp-2">
                      💬 {sub.note}
                    </p>
                  )}

                  {/* Pricing Display */}
                  <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3.5">
                    <div>
                      <span className="text-[22px] font-black font-mono tracking-tight text-white">
                        {effAmount.toLocaleString('cs-CZ')}
                      </span>
                      <span className="ml-1 text-xs font-black font-mono text-[var(--accent-primary)]">
                        {sub.currency}
                      </span>
                      {sub.shared && (
                        <span className="ml-1.5 text-[10px] font-bold text-white/40">
                          ({t('card.total')} {sub.amount.toLocaleString('cs-CZ')} {sub.currency})
                        </span>
                      )}
                    </div>

                    {sub.billing_cycle === 'yearly' ? (
                      <span className="text-[11px] font-mono font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        ~{(effAmount / 12).toFixed(0)} {sub.currency}{t('card.perMonthShort')}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        ~{(effAmount * 12).toLocaleString('cs-CZ')} {sub.currency}{t('card.perYearShort')}
                      </span>
                    )}
                  </div>

                  {sub.shared && sub.shared_with && (
                    <p className="mt-1.5 text-[10px] text-white/40">{t('card.sharedWith', { name: sub.shared_with })}</p>
                  )}

                  {cancelLink && (
                    <a
                      href={cancelLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1.5 inline-block text-[10px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                    >
                      Jak zrušit →
                    </a>
                  )}
                </div>

                {/* Bottom Footer: Next Payment + Due Badge */}
                <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                  <div
                    className={`flex items-center gap-1 text-white/60 font-medium ${
                      !isCancelled && hasDueBadge ? 'text-[11px]' : 'text-[13px]'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {sub.next_payment_date
                        ? new Date(sub.next_payment_date).toLocaleDateString('cs-CZ')
                        : t('card.noDate')}
                    </span>
                  </div>

                  {!isCancelled && hasDueBadge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono shadow-sm ${
                        isOverdue || isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                      }`}
                    >
                      {isOverdue
                        ? t('card.overdue')
                        : daysRemaining === 0
                        ? t('card.dueToday')
                        : daysRemaining === 1
                        ? t('card.dueTomorrow')
                        : t('card.dueInDays', {
                            n: daysRemaining as number,
                            unit: t((daysRemaining as number) < 5 ? 'card.dueInDaysUnitFew' : 'card.dueInDaysUnitMany'),
                          })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cancelTarget && (
        <CancelSheet
          subscription={cancelTarget}
          onClose={() => !isCancelling && setCancelTarget(null)}
          onConfirmCancel={handleConfirmCancel}
        />
      )}

      {celebrationTarget && (
        <CancellationCelebration
          subscriptionName={celebrationTarget.name}
          monthlyAmount={
            celebrationTarget.billing_cycle === 'yearly'
              ? effectiveAmount(celebrationTarget) / 12
              : effectiveAmount(celebrationTarget)
          }
          currency={celebrationTarget.currency}
          onClose={() => setCelebrationTarget(null)}
        />
      )}
    </div>
  )
}
