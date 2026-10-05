'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Subscription } from './SubscriptionList'
import { DetoxSession, getDetoxProgress } from '@/utils/detox'
import { endDetoxEarly } from '@/app/actions/detox'

function formatCzk(amount: number): string {
  return `${Math.round(amount).toLocaleString('cs-CZ')} Kč`
}

export default function DetoxWidget({
  subscriptions,
  session,
}: {
  subscriptions: Subscription[]
  session: DetoxSession | null
}) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)

  const activeSubs = subscriptions.filter((s) => s.status !== 'cancelled')
  const frozenSubs = activeSubs.filter((s) => s.detox_paused)
  const liveSession = session && new Date(session.ends_at).getTime() > new Date().getTime()

  const progress = useMemo(
    () => (liveSession && session ? getDetoxProgress(session, frozenSubs) : null),
    [liveSession, session, frozenSubs]
  )

  const handleEndEarly = async () => {
    if (!session) return
    if (!confirm('Opravdu chceš detox ukončit předčasně?')) return
    setIsEnding(true)
    await endDetoxEarly(session.id)
    setIsEnding(false)
    router.refresh()
  }

  if (liveSession && progress) {
    return (
      <div className="rounded-2xl border border-blue-300/30 bg-blue-400/10 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-blue-100">
            🧹 Detox aktivní — Den {progress.elapsedDays}/{progress.totalDays}
          </p>
          <Link href="/dashboard/detox" className="text-[11px] font-bold text-blue-200 hover:text-white">
            Detail →
          </Link>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #93c5fd, #34d399)' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
          <span>Zatím ušetřeno: {formatCzk(progress.savedSoFar)}</span>
          <span>Zbývá: {formatCzk(progress.remaining)}</span>
        </div>
        <button
          type="button"
          onClick={handleEndEarly}
          disabled={isEnding}
          className="mt-2.5 text-[11px] font-bold text-rose-300 hover:text-rose-200 disabled:opacity-50"
        >
          Ukončit detox předčasně
        </button>
      </div>
    )
  }

  if (frozenSubs.length > 0) {
    return (
      <Link
        href="/dashboard/detox"
        className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 hover:bg-emerald-500/15"
      >
        <p className="text-xs font-bold text-emerald-300">🎉 Tvůj Detox skončil! Podívej se na výsledky →</p>
      </Link>
    )
  }

  if (activeSubs.length === 0) return null

  return (
    <Link
      href="/dashboard/detox"
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06]"
    >
      <p className="text-xs font-bold text-white/80">🧹 Spustit Subscription Detox →</p>
    </Link>
  )
}
