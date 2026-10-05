'use client'

import { useEffect, useState } from 'react'
import { addSubscription } from '@/app/actions/subscriptions'
import { suggestCategory } from '@/utils/categories'
import type { DetectedBankSubscription, TrueLayerTransaction } from '@/utils/trueLayer'

type Status = 'loading' | 'results' | 'empty' | 'error' | 'adding' | 'added'

export default function BankConnectModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedBankSubscription[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [addedCount, setAddedCount] = useState(0)

  useEffect(() => {
    const run = async () => {
      try {
        const txRes = await fetch('/api/bank/transactions')
        const txData = await txRes.json()
        if (!txRes.ok) throw new Error(txData.error || 'Nepodařilo se načíst transakce.')

        const transactions: TrueLayerTransaction[] = txData.transactions || []

        const detectRes = await fetch('/api/bank/detect-subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions }),
        })
        const detectData = await detectRes.json()
        if (!detectRes.ok) throw new Error(detectData.error || 'Nepodařilo se analyzovat transakce.')

        const subscriptions: DetectedBankSubscription[] = detectData.subscriptions || []
        setDetected(subscriptions)
        setSelected(new Set(subscriptions.map((_, idx) => idx)))
        setStatus(subscriptions.length === 0 ? 'empty' : 'results')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nastala neočekávaná chyba.')
        setStatus('error')
      }
    }
    run()
  }, [])

  const toggleSelected = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleAddSelected = async () => {
    setStatus('adding')
    let successCount = 0

    for (const idx of selected) {
      const sub = detected[idx]
      const formData = new FormData()
      formData.set('name', sub.name)
      formData.set('amount', String(sub.amount))
      formData.set('currency', sub.currency || 'CZK')
      formData.set('billing_cycle', sub.frequency || 'monthly')
      formData.set('category', suggestCategory(sub.name))

      const result = await addSubscription(null, formData)
      if (result.success) successCount++
    }

    setAddedCount(successCount)
    setStatus('added')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0" onClick={status !== 'adding' ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">
            {status === 'results' || status === 'adding' || status === 'added'
              ? `Banka propojena! Nalezeno ${detected.length} ${detected.length === 1 ? 'předplatné' : 'předplatných'}`
              : 'Banka propojena!'}
          </h3>
          {status !== 'adding' && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
            >
              ✕
            </button>
          )}
        </div>

        {status === 'loading' && (
          <div className="mt-6 flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent-primary)]" />
            <p className="text-xs text-white/60">Analyzuji transakce za posledních 90 dní…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-rose-300">{error}</p>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
            >
              Zavřít
            </button>
          </div>
        )}

        {status === 'empty' && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-white/60">V posledních 90 dnech jsme nenašli žádná opakující se předplatná.</p>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
            >
              Zavřít
            </button>
          </div>
        )}

        {(status === 'results' || status === 'adding') && (
          <>
            <div className="mt-4 space-y-2.5">
              {detected.map((sub, idx) => (
                <label
                  key={`${sub.name}-${idx}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleSelected(idx)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{sub.name}</p>
                    <p className="text-[10px] text-white/50">
                      {sub.amount.toLocaleString('cs-CZ')} {sub.currency} ·{' '}
                      {sub.frequency === 'yearly' ? 'ročně' : 'měsíčně'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleAddSelected}
              disabled={selected.size === 0 || status === 'adding'}
              className="mt-4 w-full rounded-2xl theme-accent-btn py-3 text-xs font-black tracking-wide disabled:opacity-50"
            >
              {status === 'adding' ? 'Přidávám…' : `Přidat do Killsub (${selected.size})`}
            </button>
          </>
        )}

        {status === 'added' && (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm font-bold text-emerald-300">
              {addedCount > 0
                ? `Přidáno ${addedCount} ${addedCount === 1 ? 'předplatné' : 'předplatných'} do Killsub.`
                : 'Nepodařilo se přidat žádné předplatné.'}
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-2xl theme-accent-btn py-3 text-xs font-black tracking-wide"
            >
              Zpět na dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
