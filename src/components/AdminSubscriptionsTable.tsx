'use client'

import { useMemo, useState } from 'react'
import type { AdminSubscriptionRow } from '@/utils/adminData'

export default function AdminSubscriptionsTable({ subscriptions }: { subscriptions: AdminSubscriptionRow[] }) {
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => ['all', ...new Set(subscriptions.map((s) => s.category))], [subscriptions])

  const filtered = useMemo(
    () => (category === 'all' ? subscriptions : subscriptions.filter((s) => s.category === category)),
    [subscriptions, category]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'Všechny kategorie' : c}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-white/40">{filtered.length} záznamů</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-white/50">
              <th className="px-3 py-2.5 font-bold">Uživatel</th>
              <th className="px-3 py-2.5 font-bold">Název</th>
              <th className="px-3 py-2.5 font-bold">Částka</th>
              <th className="px-3 py-2.5 font-bold">Kategorie</th>
              <th className="px-3 py-2.5 font-bold">Přidáno</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-white/70">{s.userEmail}</td>
                <td className="px-3 py-2.5 font-bold text-white">{s.name}</td>
                <td className="px-3 py-2.5 font-mono text-white/70">
                  {s.amount.toLocaleString('cs-CZ')} {s.currency}
                </td>
                <td className="px-3 py-2.5 text-white/60">{s.category}</td>
                <td className="px-3 py-2.5 text-white/50">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString('cs-CZ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-center text-xs text-white/40">Žádná předplatná.</p>}
      </div>
    </div>
  )
}
