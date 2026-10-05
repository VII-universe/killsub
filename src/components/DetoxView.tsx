'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import {
  DetoxSession,
  getDetoxProgress,
  monthlyEquivalent,
  suggestFreezeDefault,
} from '@/utils/detox'
import {
  startDetoxSession,
  endDetoxEarly,
  markDetoxCompletedIfExpired,
  finishDetoxCancelMissed,
  finishDetoxRestoreAll,
} from '@/app/actions/detox'

function formatCzk(amount: number): string {
  return `${Math.round(amount).toLocaleString('cs-CZ')} Kč`
}

export default function DetoxView({
  subscriptions,
  session,
}: {
  subscriptions: Subscription[]
  session: DetoxSession | null
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSubs = subscriptions.filter((s) => s.status !== 'cancelled')
  const frozenSubs = activeSubs.filter((s) => s.detox_paused)

  // A session can be 'active' past its own ends_at for a bit — until the
  // next /api/cron/detox-check run flips it, or until this effect does it
  // on the user's first post-expiry visit. Either way we already know this
  // should render as Results, so we don't wait on the PATCH to do it.
  const isExpiredActive = useMemo(
    () => !!session && session.status === 'active' && new Date(session.ends_at).getTime() <= new Date().getTime(),
    [session]
  )

  useEffect(() => {
    if (session && isExpiredActive) {
      markDetoxCompletedIfExpired(session.id)
    }
  }, [session, isExpiredActive])

  // Status drives the phase directly — no guessing from side-effects like
  // "are there still frozen subscriptions". 'abandoned' (ended early, or a
  // previously resolved cycle) and "no session at all" both mean Setup.
  // The completion e-mail links to /dashboard/detox?phase=results, but no
  // special handling of that param is needed: a completed session already
  // resolves to Results below on its own, and the param can't (and
  // shouldn't) force Results onto a session that isn't actually completed.
  let phase: 'setup' | 'active' | 'results'
  if (!session || session.status === 'abandoned') {
    phase = 'setup'
  } else if (session.status === 'completed' || isExpiredActive) {
    phase = 'results'
  } else {
    phase = 'active'
  }

  if (phase === 'setup') {
    return <DetoxSetup subscriptions={activeSubs} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} error={error} setError={setError} router={router} />
  }

  if (phase === 'active' && session) {
    return (
      <DetoxActive
        session={session}
        frozenSubs={frozenSubs}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        router={router}
      />
    )
  }

  if (phase === 'results' && session) {
    return (
      <DetoxResults
        session={session}
        frozenSubs={frozenSubs}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        router={router}
      />
    )
  }

  return null
}

function DetoxSetup({
  subscriptions,
  isSubmitting,
  setIsSubmitting,
  error,
  setError,
  router,
}: {
  subscriptions: Subscription[]
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
  error: string | null
  setError: (v: string | null) => void
  router: ReturnType<typeof useRouter>
}) {
  const [frozenIds, setFrozenIds] = useState<Set<string>>(
    () => new Set(subscriptions.filter((s) => suggestFreezeDefault(s)).map((s) => s.id))
  )

  const toggle = (id: string) => {
    setFrozenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const freezeList = subscriptions.filter((s) => frozenIds.has(s.id))
  const keepList = subscriptions.filter((s) => !frozenIds.has(s.id))

  const handleStart = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await startDetoxSession(Array.from(frozenIds))
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#080313] p-5 pb-28">
      <Link href="/dashboard" className="text-xs font-bold text-white/50 hover:text-white">
        ← Zpět na dashboard
      </Link>

      <h1 className="mt-4 text-xl font-black text-white">30denní Subscription Detox 🧹</h1>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">
        Zmraz všechna nepodstatná předplatná na 30 dní. Uvidíš kolik peněz se ti nakumuluje — a zjistíš která ti
        reálně chybí.
      </p>

      {subscriptions.length === 0 ? (
        <p className="mt-8 text-sm text-white/60">Nemáš žádná aktivní předplatná k zařazení do detoxu.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-blue-300">❄️ Zmrazit</h2>
              <div className="mt-2 space-y-2">
                {subscriptions.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={frozenIds.has(sub.id)}
                      onChange={() => toggle(sub.id)}
                      className="h-4 w-4 rounded border-white/20 bg-black/40 accent-blue-400"
                    />
                    <span className="min-w-0 truncate text-xs font-bold text-white">{sub.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white/60">Ponechat</h2>
              <div className="mt-2 space-y-2">
                {subscriptions.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={!frozenIds.has(sub.id)}
                      onChange={() => toggle(sub.id)}
                      className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
                    />
                    <span className="min-w-0 truncate text-xs font-bold text-white">{sub.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-300/30 bg-blue-400/10 p-3.5 text-xs text-blue-100">
            Zmrazíš {freezeList.length} {freezeList.length === 1 ? 'předplatné' : 'předplatných'} za{' '}
            <strong>{formatCzk(freezeList.reduce((sum, s) => sum + monthlyEquivalent(s), 0))}/měs.</strong> Ponecháš{' '}
            {keepList.length}.
          </div>

          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

          <button
            type="button"
            onClick={handleStart}
            disabled={isSubmitting || freezeList.length === 0}
            className="mt-5 flex w-full items-center justify-center rounded-2xl theme-accent-btn py-3.5 px-4 text-sm font-black tracking-wide shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Spouštím…' : 'Spustit Detox'}
          </button>
        </>
      )}
    </div>
  )
}

function DetoxActive({
  session,
  frozenSubs,
  isSubmitting,
  setIsSubmitting,
  router,
}: {
  session: DetoxSession
  frozenSubs: Subscription[]
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
  router: ReturnType<typeof useRouter>
}) {
  const progress = useMemo(() => getDetoxProgress(session, frozenSubs), [session, frozenSubs])
  const [confirmEnd, setConfirmEnd] = useState(false)

  const handleEndEarly = async () => {
    setIsSubmitting(true)
    await endDetoxEarly(session.id)
    setIsSubmitting(false)
    setConfirmEnd(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#080313] p-5 pb-28">
      <Link href="/dashboard" className="text-xs font-bold text-white/50 hover:text-white">
        ← Zpět na dashboard
      </Link>

      <h1 className="mt-4 text-xl font-black text-white">🧹 Detox aktivní — Den {progress.elapsedDays}/{progress.totalDays}</h1>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress.percent}%`,
            background: 'linear-gradient(90deg, #93c5fd, #34d399)',
          }}
        />
      </div>
      <p className="mt-1 text-right text-[11px] text-white/50">{progress.percent}%</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Zatím ušetřeno</p>
          <p className="mt-1 text-lg font-black text-white">{formatCzk(progress.savedSoFar)}</p>
        </div>
        <div className="rounded-2xl border border-blue-300/30 bg-blue-400/10 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Zbývá do konce</p>
          <p className="mt-1 text-lg font-black text-white">{formatCzk(progress.remaining)}</p>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-xs font-black uppercase tracking-wider text-white/60">Zmrazená předplatná</h2>
        <div className="mt-2 space-y-2">
          {frozenSubs.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-xl border border-blue-300/20 bg-blue-400/[0.05] p-2.5"
            >
              <span className="text-xs font-bold text-white">❄️ {sub.name}</span>
              <span className="text-xs text-white/60">{formatCzk(monthlyEquivalent(sub))}/měs.</span>
            </div>
          ))}
        </div>
      </div>

      {!confirmEnd ? (
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          className="mt-6 flex w-full items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3 px-4 text-xs font-black text-rose-300 transition-all hover:bg-rose-500/20 active:scale-[0.98]"
        >
          Ukončit detox předčasně
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5">
          <p className="text-xs font-bold text-rose-200">
            Opravdu ukončit? Všechna zmrazená předplatná budou obnovena.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleEndEarly}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-rose-500/50 bg-rose-500/20 py-2.5 text-xs font-black text-rose-100 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Ukončuji…' : 'Ano, ukončit'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmEnd(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.03] py-2.5 text-xs font-bold text-white/70 active:scale-[0.98] disabled:opacity-50"
            >
              Ne, pokračovat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetoxResults({
  session,
  frozenSubs,
  isSubmitting,
  setIsSubmitting,
  router,
}: {
  session: DetoxSession
  frozenSubs: Subscription[]
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
  router: ReturnType<typeof useRouter>
}) {
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>({})

  const progress = useMemo(() => getDetoxProgress(session, frozenSubs), [session, frozenSubs])
  const missedIds = frozenSubs.filter((s) => answers[s.id] === 'no').map((s) => s.id)
  const missedSubs = frozenSubs.filter((s) => answers[s.id] === 'no')

  const handleCancelMissed = async () => {
    setIsSubmitting(true)
    await finishDetoxCancelMissed(session.id, missedIds)
    setIsSubmitting(false)
    router.refresh()
  }

  const handleRestoreAll = async () => {
    setIsSubmitting(true)
    await finishDetoxRestoreAll(session.id)
    setIsSubmitting(false)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#080313] p-5 pb-28">
      <div className="mx-auto max-w-sm text-center">
        <h1 className="mt-6 text-2xl font-black text-white">Detox dokončen! 🎉</h1>
        <p className="mt-3 text-sm text-white/80">
          Ušetřil jsi <strong className="text-emerald-300">{formatCzk(progress.savedSoFar)}</strong> za 30 dní.
        </p>

        <div className="mt-6 space-y-2.5 text-left">
          {frozenSubs.map((sub) => (
            <div key={sub.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-xs font-bold text-white">Chybělo ti {sub.name}?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [sub.id]: 'yes' }))}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                    answers[sub.id] === 'yes'
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-white/60'
                  }`}
                >
                  Ano
                </button>
                <button
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [sub.id]: 'no' }))}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                    answers[sub.id] === 'no'
                      ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                      : 'border-white/10 bg-white/[0.03] text-white/60'
                  }`}
                >
                  Ne
                </button>
              </div>
            </div>
          ))}
        </div>

        {missedSubs.length > 0 && (
          <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-left">
            <p className="text-xs font-bold text-rose-300">
              Doporučujeme zrušit: {missedSubs.map((s) => s.name).join(', ')}
            </p>
            <button
              type="button"
              onClick={handleCancelMissed}
              disabled={isSubmitting}
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 py-2.5 px-4 text-xs font-black text-rose-200 active:scale-[0.98] disabled:opacity-50"
            >
              Zrušit vše najednou
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleRestoreAll}
          disabled={isSubmitting}
          className="mt-4 flex w-full items-center justify-center rounded-2xl theme-accent-btn py-3.5 px-4 text-sm font-black tracking-wide shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          Obnovit vše a pokračovat
        </button>
      </div>
    </div>
  )
}
