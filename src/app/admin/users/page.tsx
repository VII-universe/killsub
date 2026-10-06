'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { AdminUserRow } from '@/utils/adminData'

type SortKey = 'created' | 'subscriptions'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created')

  useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return users
      .filter((u) => u.email.toLowerCase().includes(lower))
      .sort((a, b) => {
        if (sortKey === 'subscriptions') return b.subscriptionCount - a.subscriptionCount
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
  }, [users, search, sortKey])

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Uživatelé ({users.length})</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Hledat podle e-mailu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="created">Datum registrace</option>
            <option value="subscriptions">Počet předplatných</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-white/50">Načítám…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-white/50">
                <th className="px-3 py-2.5 font-bold">E-mail</th>
                <th className="px-3 py-2.5 font-bold">Registrace</th>
                <th className="px-3 py-2.5 font-bold">Předplatná</th>
                <th className="px-3 py-2.5 font-bold">Pro</th>
                <th className="px-3 py-2.5 font-bold">Stripe ID</th>
                <th className="px-3 py-2.5 font-bold">Poslední přihlášení</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="font-bold text-white hover:text-[var(--accent-primary,#ec4899)]">
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/60">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('cs-CZ') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-white/60">{u.subscriptionCount}</td>
                  <td className="px-3 py-2.5">
                    {u.isPro ? (
                      <span className="rounded-md border border-[var(--accent-primary,#ec4899)]/40 bg-[var(--accent-primary,#ec4899)]/10 px-1.5 py-0.5 text-[10px] font-black text-[var(--accent-primary,#ec4899)]">
                        PRO
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-white/40">{u.stripeCustomerId || '—'}</td>
                  <td className="px-3 py-2.5 text-white/60">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('cs-CZ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-4 text-center text-xs text-white/40">Žádní uživatelé.</p>}
        </div>
      )}
    </div>
  )
}
