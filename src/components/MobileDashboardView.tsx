'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ThemeSelector from '@/components/ThemeSelector'
import MobileAIHeroCard from '@/components/MobileAIHeroCard'
import ServiceLogo from '@/components/ServiceLogo'
import SubscriptionList, { Subscription } from '@/components/SubscriptionList'
import AddSubscriptionForm from '@/components/AddSubscriptionForm'
import CategoryChart from '@/components/CategoryChart'
import CashflowCalendar from '@/components/CashflowCalendar'
import ShareWrappedButton from '@/components/ShareWrappedButton'
import NotificationSettingsPanel from '@/components/NotificationSettingsPanel'
import { signOut } from '@/app/actions/auth'
import { DEMO_SUBSCRIPTIONS } from '@/utils/demoData'
import { exportSubscriptionsToCsv } from '@/utils/csv'
import { UserProfileData } from '@/utils/plan'
import PlanSettingsPanel from '@/components/PlanSettingsPanel'
import ReferralPanel from '@/components/ReferralPanel'
import PublicProfileToggle from '@/components/PublicProfileToggle'
import UpgradeModal from '@/components/UpgradeModal'
import PortfolioScoreCard from '@/components/PortfolioScoreCard'
import BadgesPanel from '@/components/BadgesPanel'
import CleanseChallenge from '@/components/CleanseChallenge'
import ImportSettingsPanel from '@/components/ImportSettingsPanel'
import PushNotificationsPanel from '@/components/PushNotificationsPanel'
import RemindersWidget from '@/components/RemindersWidget'
import OnboardingOverlay from '@/components/OnboardingOverlay'
import CatalogPicker from '@/components/CatalogPicker'
import SpendingTrendsChart from '@/components/SpendingTrendsChart'
import HelpSheet from '@/components/HelpSheet'
import { updateStreak } from '@/utils/badges'
import { detectDuplicates } from '@/utils/duplicates'

const DEMO_STORAGE_KEY = 'killsub-demo-mode'

export default function MobileDashboardView({
  userEmail,
  subscriptions,
  dbError,
  profile,
  importDomain,
}: {
  userEmail?: string
  subscriptions: Subscription[]
  dbError?: { message: string } | null
  profile: UserProfileData | null
  importDomain: string
}) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'subscriptions' | 'settings'>('home')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null)
  const [startAddModalInAiMode, setStartAddModalInAiMode] = useState(false)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [quickAddPrefill, setQuickAddPrefill] = useState<{
    name?: string
    amount?: string
    currency?: string
    billing_cycle?: string
    next_payment_date?: string
  } | null>(null)

  const isPro = profile?.plan === 'pro'

  const handleQuickAdd = (item: { name: string; amount: string; currency: string; billing_cycle: string }) => {
    setQuickAddPrefill(item)
    setIsFormModalOpen(true)
  }

  const handleCatalogSelect = (item: { name: string; defaultAmount: number; currency: string; billing_cycle: string }) => {
    setQuickAddPrefill({
      name: item.name,
      amount: String(item.defaultAmount),
      currency: item.currency,
      billing_cycle: item.billing_cycle,
    })
    setIsFormModalOpen(true)
  }

  const handleCalendarDayClick = (isoDate: string) => {
    setQuickAddPrefill({ next_payment_date: isoDate })
    setIsFormModalOpen(true)
  }

  const openAiImport = () => {
    if (isPro) {
      setStartAddModalInAiMode(true)
      setIsFormModalOpen(true)
    } else {
      setUpgradeMessage('AI import faktur pomocí Gemini je dostupný pouze pro Pro plán.')
    }
  }

  // Increment the daily-open streak once per mount (client-only, drives the "Věrný" badge).
  useEffect(() => {
    updateStreak()
  }, [])

  // Read localStorage after mount only, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    if (subscriptions.length === 0 && localStorage.getItem(DEMO_STORAGE_KEY) === '1') {
      setIsDemoMode(true)
    }
  }, [subscriptions.length])

  const handleLoadDemo = () => {
    setIsDemoMode(true)
    localStorage.setItem(DEMO_STORAGE_KEY, '1')
  }

  const handleClearDemo = () => {
    setIsDemoMode(false)
    localStorage.removeItem(DEMO_STORAGE_KEY)
  }

  const effectiveSubscriptions = isDemoMode && subscriptions.length === 0 ? DEMO_SUBSCRIPTIONS : subscriptions

  const openEditModal = (sub: Subscription) => {
    setEditingSubscription(sub)
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingSubscription(null)
    setStartAddModalInAiMode(false)
    setQuickAddPrefill(null)
  }

  const duplicates = useMemo(() => detectDuplicates(effectiveSubscriptions), [effectiveSubscriptions])

  // Calculate totals
  const totals = useMemo(
    () =>
      effectiveSubscriptions.reduce(
        (acc, sub) => {
          const cur = sub.currency || 'CZK'
          const amt = Number(sub.amount) || 0
          const monthlyAmt = sub.billing_cycle === 'yearly' ? amt / 12 : amt
          const yearlyAmt = sub.billing_cycle === 'yearly' ? amt : amt * 12

          if (!acc[cur]) acc[cur] = { monthly: 0, yearly: 0 }
          acc[cur].monthly += monthlyAmt
          acc[cur].yearly += yearlyAmt
          return acc
        },
        {} as Record<string, { monthly: number; yearly: number }>
      ),
    [effectiveSubscriptions]
  )

  const upcomingPayments = [...effectiveSubscriptions]
    .filter((s) => s.next_payment_date)
    .sort((a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime())

  const nextUpcoming = upcomingPayments[0]

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}
    >
      <OnboardingOverlay
        subscriptions={subscriptions}
        onboarded={profile?.onboarded ?? false}
        onOpenAddModal={() => setIsFormModalOpen(true)}
      />

      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-2xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          {/* Logo / Mascot Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] p-0.5 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0c081e]">
                <svg className="h-4 w-4 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight font-mono">KILLSUB</span>
                {isPro ? (
                  <span className="rounded-full bg-indigo-500/15 px-1.5 text-[9px] font-black text-indigo-300 border border-indigo-500/40">
                    PRO
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--pill-bg)] px-1.5 text-[9px] font-black text-[var(--accent-primary)] border border-white/10">
                    VII
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/50 truncate max-w-[140px] font-mono">
                {userEmail || 'Uživatel'}
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Selector + Logout */}
          <div className="flex items-center gap-2">
            <ThemeSelector />

            <form action={signOut}>
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all"
                title="Odhlásit se"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container: Mobile-First Max Width */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 space-y-5">
        {/* Database Warning */}
        {dbError && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-200">
            <p className="font-bold">Chybí tabulka subscriptions</p>
            <p className="text-[11px] opacity-80 mt-0.5">{dbError.message}</p>
          </div>
        )}

        {/* Demo mode banner */}
        {isDemoMode && subscriptions.length === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-3.5 text-xs text-indigo-200">
            <span className="font-bold">✨ Zobrazena ukázková data</span>
            <button
              onClick={handleClearDemo}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/10"
            >
              Vymazat demo data
            </button>
          </div>
        )}

        {/* Wrapped banner — shown in Q4 (or always in dev, for testing) */}
        {(new Date().getMonth() >= 9 || process.env.NODE_ENV === 'development') && (
          <Link
            href="/wrapped"
            className="flex items-center justify-between gap-2 rounded-2xl border border-[rgba(108,71,255,0.35)] bg-[rgba(108,71,255,0.12)] px-4 py-3 text-sm font-bold text-white hover:bg-[rgba(108,71,255,0.18)] transition-colors"
          >
            <span>🎁 Killsub Wrapped {new Date().getFullYear()} je připraven</span>
            <span>→</span>
          </Link>
        )}

        {/* Tab 1: Home View (Hero + Metrics + Subscriptions Preview) */}
        {activeTab === 'home' && (
          <>
            {/* Mascot AI Banner (Reference 1: CareAI Pro Experience) */}
            <MobileAIHeroCard
              onOpenForm={() => setIsFormModalOpen(true)}
              onOpenAiImport={openAiImport}
              isPro={isPro}
              subscriptions={effectiveSubscriptions}
              onQuickAdd={handleQuickAdd}
            />

            {/* Financial Overview (Reference 2 & 3: UXDA RedDot Winner cards) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly Spend Card — primary */}
              <div className="rounded-3xl border-y border-r border-white/[0.11] border-l-[3px] border-l-[#6c47ff] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-xl backdrop-blur-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">
                  Měsíční útrata
                </span>
                <div className="mt-2">
                  {Object.keys(totals).length > 0 ? (
                    Object.entries(totals).map(([cur, data]) => (
                      <div key={cur} className="flex items-baseline gap-1">
                        <span className="text-[36px] font-extrabold font-mono tracking-tight text-white leading-none">
                          {data.monthly.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-black font-mono text-[var(--accent-primary)]">
                          {cur}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[36px] font-extrabold font-mono text-white/40 leading-none">0 CZK</span>
                  )}
                </div>
                <span className="text-[10px] text-white/50 mt-1 block">
                  {effectiveSubscriptions.length} {effectiveSubscriptions.length === 1 ? 'služba' : 'služeb'}
                </span>
              </div>

              {/* Next Due Date Card — secondary */}
              <div className="rounded-3xl border border-white/[0.11] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-xl backdrop-blur-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">
                  Nejbližší platba
                </span>
                <div className="mt-2">
                  {nextUpcoming ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ServiceLogo name={nextUpcoming.name} size={16} customLogoUrl={nextUpcoming.logo_url} />
                        <span className="truncate text-sm font-black text-white">
                          {nextUpcoming.name}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] font-black font-mono text-[var(--accent-primary)]">
                        {new Date(nextUpcoming.next_payment_date!).toLocaleDateString('cs-CZ')}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-white/40 mt-1 block">Žádné termíny</span>
                  )}
                </div>
                <span className="text-[10px] text-white/50 mt-1 block">
                  {nextUpcoming ? `${nextUpcoming.amount} ${nextUpcoming.currency}` : 'Vše uhrazeno'}
                </span>
              </div>
            </div>

            {effectiveSubscriptions.length > 0 && (
              <div className="relative">
                <div className={!isPro ? 'pointer-events-none select-none blur-sm opacity-50' : ''}>
                  <PortfolioScoreCard subscriptions={effectiveSubscriptions} />
                </div>
                {!isPro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
                    <p className="text-xs font-bold text-white/80 mb-2">Dostupné v Pro</p>
                    <button
                      onClick={() => setUpgradeMessage('Portfolio skóre a kategorizace jsou součástí Killsub Pro.')}
                      className="rounded-xl theme-accent-btn px-4 py-1.5 text-xs font-black"
                    >
                      Odemknout
                    </button>
                  </div>
                )}
              </div>
            )}

            {effectiveSubscriptions.length > 0 && (
              <div className="relative">
                <div className={!isPro ? 'pointer-events-none select-none blur-sm opacity-50' : ''}>
                  <CategoryChart subscriptions={effectiveSubscriptions} />
                </div>
                {!isPro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
                    <p className="text-xs font-bold text-white/80 mb-2">Dostupné v Pro</p>
                    <button
                      onClick={() => setUpgradeMessage('Portfolio skóre a kategorizace jsou součástí Killsub Pro.')}
                      className="rounded-xl theme-accent-btn px-4 py-1.5 text-xs font-black"
                    >
                      Odemknout
                    </button>
                  </div>
                )}
              </div>
            )}

            {effectiveSubscriptions.length > 0 && (
              <SpendingTrendsChart
                subscriptions={effectiveSubscriptions}
                isPro={isPro}
                onUpgrade={() => setUpgradeMessage('Vývoj výdajů za 12 měsíců je součástí Killsub Pro.')}
              />
            )}

            <RemindersWidget />

            {duplicates.map((d) => (
              <div key={d.category} className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="text-xs font-bold text-yellow-400">⚠️ Duplicitní {d.category}</p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  {d.services.join(' + ')} — platíš {Math.round(d.totalAmount)} Kč/měs. za stejnou kategorii
                </p>
              </div>
            ))}

            {/* Subscriptions List Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-3 gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Moje předplatná
                </h3>
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/dashboard/import"
                    title="Import z bankovního výpisu"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
                    </svg>
                  </Link>
                  {effectiveSubscriptions.length > 0 && (
                    <button
                      onClick={() => exportSubscriptionsToCsv(effectiveSubscriptions)}
                      title="Export CSV"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setIsCatalogOpen(true)}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/80 hover:bg-white/10"
                  >
                    📚 Z katalogu
                  </button>
                  <button
                    onClick={() => setIsFormModalOpen(true)}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/15"
                  >
                    + Přidat nové
                  </button>
                </div>
              </div>

              {effectiveSubscriptions.length > 0 && (
                <div className="mb-3 flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-xs w-fit">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                      viewMode === 'list' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    📋 Seznam
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                      viewMode === 'calendar' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    📅 Kalendář
                  </button>
                </div>
              )}

              {viewMode === 'calendar' && effectiveSubscriptions.length > 0 ? (
                <CashflowCalendar subscriptions={effectiveSubscriptions} onDayClick={handleCalendarDayClick} />
              ) : (
                <SubscriptionList
                  subscriptions={effectiveSubscriptions}
                  onOpenAddModal={() => setIsFormModalOpen(true)}
                  onLoadDemo={subscriptions.length === 0 ? handleLoadDemo : undefined}
                  onEdit={isDemoMode && subscriptions.length === 0 ? undefined : openEditModal}
                  readOnly={isDemoMode && subscriptions.length === 0}
                />
              )}

              {!isPro && effectiveSubscriptions.length >= 4 && (
                <div className="mt-3 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-3 flex items-center justify-between">
                  <p className="text-xs text-white/70">
                    <span className="font-bold text-white">1 předplatné do limitu.</span> Free plán = max 5.
                  </p>
                  <button
                    onClick={() => setUpgradeMessage('Přejděte na Pro a spravujte neomezené množství předplatných.')}
                    className="ml-3 shrink-0 rounded-xl theme-accent-btn px-3 py-1.5 text-xs font-black"
                  >
                    Pro
                  </button>
                </div>
              )}
            </div>

            {/* Cleanse challenge + viral share — last thing before the bottom nav */}
            <div className="relative">
              <div className={!isPro ? 'pointer-events-none select-none blur-sm opacity-50' : ''}>
                <CleanseChallenge />
              </div>
              {!isPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
                  <p className="text-xs font-bold text-white/80 mb-2">Dostupné v Pro</p>
                  <button
                    onClick={() => setUpgradeMessage('Cleanse Challenge je součástí Killsub Pro.')}
                    className="rounded-xl theme-accent-btn px-4 py-1.5 text-xs font-black"
                  >
                    Odemknout
                  </button>
                </div>
              )}
            </div>

            {effectiveSubscriptions.length > 0 && (
              <ShareWrappedButton subscriptions={effectiveSubscriptions} variant="prominent" />
            )}
          </>
        )}

        {/* Tab 2: Subscriptions Only View */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-white">Všechna předplatná</h2>
              <div className="flex items-center gap-1.5">
                {effectiveSubscriptions.length > 0 && (
                  <button
                    onClick={() => exportSubscriptionsToCsv(effectiveSubscriptions)}
                    title="Export CSV"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsFormModalOpen(true)}
                  className="rounded-full theme-accent-btn px-3 py-1.5 text-xs font-black"
                >
                  + Přidat
                </button>
              </div>
            </div>

            {effectiveSubscriptions.length > 0 && (
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-xs w-fit">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                    viewMode === 'list' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  📋 Seznam
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                    viewMode === 'calendar' ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  📅 Kalendář
                </button>
              </div>
            )}

            {viewMode === 'calendar' && effectiveSubscriptions.length > 0 ? (
              <CashflowCalendar subscriptions={effectiveSubscriptions} onDayClick={handleCalendarDayClick} />
            ) : (
              <SubscriptionList
                subscriptions={effectiveSubscriptions}
                onOpenAddModal={() => setIsFormModalOpen(true)}
                onLoadDemo={subscriptions.length === 0 ? handleLoadDemo : undefined}
                onEdit={isDemoMode && subscriptions.length === 0 ? undefined : openEditModal}
                readOnly={isDemoMode && subscriptions.length === 0}
              />
            )}
          </div>
        )}

        {/* Tab 3: Settings / Profile Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 space-y-4 backdrop-blur-xl">
              <h2 className="text-base font-black text-white">Nastavení aplikace</h2>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] text-white/60 font-semibold block">Vizuální styl (Téma)</span>
                  <div className="mt-1.5">
                    <ThemeSelector />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <span className="text-[11px] text-white/60 font-semibold block">Přihlášený uživatel</span>
                  <span className="text-xs font-mono font-bold text-white">{userEmail}</span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3 text-xs font-black text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      Odhlásit se z účtu
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <PlanSettingsPanel profile={profile} />

            <BadgesPanel subscriptions={subscriptions} />

            <NotificationSettingsPanel isPro={isPro} onLocked={() => setUpgradeMessage('E-mailové notifikace jsou dostupné pouze pro Pro plán.')} />

            <PushNotificationsPanel />

            {profile && (
              <ImportSettingsPanel importToken={profile.importToken} importDomain={importDomain} isPro={isPro} />
            )}

            {profile && <ReferralPanel referralCode={profile.referralCode} />}

            {profile && (
              <PublicProfileToggle referralCode={profile.referralCode} initialIsPublic={profile.isPublic} />
            )}

            <button
              onClick={async () => {
                const res = await fetch('/api/export')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'killsub-export.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm text-white/80 hover:bg-white/10"
            >
              <span className="text-lg">📥</span>
              <div>
                <p className="font-medium text-white">Exportovat data</p>
                <p className="text-xs text-white/50">Stáhnout předplatná jako CSV</p>
              </div>
            </button>
          </div>
        )}
      </main>

      {upgradeMessage && (
        <UpgradeModal message={upgradeMessage} onClose={() => setUpgradeMessage(null)} />
      )}

      {isCatalogOpen && (
        <CatalogPicker onSelect={handleCatalogSelect} onClose={() => setIsCatalogOpen(false)} />
      )}

      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-24 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-white/70 text-sm font-black hover:text-white hover:border-white/30"
      >
        ?
      </button>
      {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}

      {/* Floating Bottom Modal Drawer for Adding/Editing Subscription */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 p-0 sm:p-4 sm:items-center">
          <div
            className="fixed inset-0"
            onClick={closeFormModal}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/20 bg-[#0f0724] p-1 shadow-2xl animate-in slide-in-from-bottom-8 duration-200">
            <AddSubscriptionForm
              onClose={closeFormModal}
              subscription={editingSubscription || undefined}
              prefill={quickAddPrefill || undefined}
              startInAiMode={startAddModalInAiMode}
              isPro={isPro}
              onAiLocked={() => {
                closeFormModal()
                setUpgradeMessage('AI import faktur pomocí Gemini je dostupný pouze pro Pro plán.')
              }}
              onLimitReached={() => {
                closeFormModal()
                setUpgradeMessage('Dosáhli jste limitu Free plánu (5 předplatných). Přejděte na Pro a spravujte neomezené předplatné.')
              }}
            />
          </div>
        </div>
      )}

      {/* Modern Bottom Navigation Dock (Reference 1, 3, 4: Mobile App Navigation Bar) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/60 backdrop-blur-2xl px-6 py-2.5 pb-[max(env(safe-area-inset-bottom),10px)]">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {/* Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
              activeTab === 'home' ? 'text-[var(--accent-primary)] font-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTab === 'home' ? 'bg-[var(--accent-primary)]/20 shadow-md shadow-[var(--accent-primary)]/30' : ''
            }`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-[10px]">Přehled</span>
          </button>

          {/* Subscriptions List */}
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
              activeTab === 'subscriptions' ? 'text-[var(--accent-primary)] font-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTab === 'subscriptions' ? 'bg-[var(--accent-primary)]/20 shadow-md shadow-[var(--accent-primary)]/30' : ''
            }`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-[10px]">Služby</span>
          </button>

          {/* Center Floating Plus / Action Button */}
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex -mt-5 h-13 w-13 items-center justify-center rounded-full theme-accent-btn shadow-lg shadow-[var(--accent-primary)]/40 border-2 border-black active:scale-90 transition-transform"
            title="Přidat předplatné"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* AI Scan Tab — opens the AI import modal directly (or an upgrade prompt on Free) */}
          <button
            onClick={openAiImport}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
              isFormModalOpen && startAddModalInAiMode ? 'text-[var(--accent-primary)] font-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              isFormModalOpen && startAddModalInAiMode ? 'bg-[var(--accent-primary)]/20 shadow-md shadow-[var(--accent-primary)]/30' : ''
            }`}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
              </svg>
            </div>
            <span className="text-[10px]">AI Sken</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
              activeTab === 'settings' ? 'text-[var(--accent-primary)] font-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-[var(--accent-primary)]/20 shadow-md shadow-[var(--accent-primary)]/30' : ''
            }`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[10px]">Témata</span>
          </button>

          {/* Ušetřit více — separate route, not an internal tab */}
          <Link
            href="/save"
            className="flex flex-col items-center gap-1 transition-all active:scale-90 text-white/50 hover:text-white/80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5a5 5 0 001 3v3h3v-2c.9.3 1.9.5 3 .5s2.1-.2 3-.5v2h3v-3a5 5 0 001-3c0-1-.4-2-1-3z" />
                <circle cx="16" cy="9" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[10px]">Ušetřit</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
