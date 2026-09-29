'use client'

import { useTransition } from 'react'
import { deleteSubscription } from '@/app/actions/subscriptions'

export default function DeleteSubscriptionButton({ id, serviceName }: { id: string; serviceName?: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const label = serviceName ? `předplatné "${serviceName}"` : 'toto předplatné'
    if (confirm(`Opravdu si přejete zrušit/smazat ${label} z Killsubu?`)) {
      startTransition(async () => {
        await deleteSubscription(id)
      })
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Smazat předplatné"
      className="group/btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:opacity-40"
    >
      {isPending ? (
        <svg className="h-4 w-4 animate-spin text-rose-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  )
}
