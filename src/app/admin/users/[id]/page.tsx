import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminUserDetail } from '@/utils/adminData'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getAdminUserDetail(id)

  if (!detail) {
    notFound()
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-xs font-bold text-white/50 hover:text-white">
          ← Zpět na uživatele
        </Link>
        <h1 className="mt-2 text-xl font-black">{detail.email}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
          <span>Registrace: {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('cs-CZ') : '—'}</span>
          <span>·</span>
          <span>Poslední přihlášení: {detail.lastSignInAt ? new Date(detail.lastSignInAt).toLocaleDateString('cs-CZ') : '—'}</span>
          {detail.isPro && (
            <span className="rounded-md border border-[var(--accent-primary,#ec4899)]/40 bg-[var(--accent-primary,#ec4899)]/10 px-1.5 py-0.5 font-black text-[var(--accent-primary,#ec4899)]">
              PRO
            </span>
          )}
        </div>
        {detail.stripeCustomerId && (
          <p className="mt-1 font-mono text-[10px] text-white/40">Stripe: {detail.stripeCustomerId}</p>
        )}
      </div>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-white/60">
          Předplatná ({detail.subscriptions.length})
        </h2>
        <div className="mt-2 space-y-2">
          {detail.subscriptions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div>
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-white/40">
                  {s.category} · {s.billing_cycle === 'yearly' ? 'Ročně' : 'Měsíčně'}
                  {s.status === 'cancelled' ? ' · zrušeno' : ''}
                </p>
              </div>
              <span className="font-mono text-white/70">
                {s.amount.toLocaleString('cs-CZ')} {s.currency}
              </span>
            </div>
          ))}
          {detail.subscriptions.length === 0 && <p className="text-xs text-white/40">Žádná předplatná.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-white/60">
          Bankovní připojení ({detail.bankConnections.length})
        </h2>
        <div className="mt-2 space-y-2">
          {detail.bankConnections.map((b) => (
            <div key={b.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="font-bold text-white">{b.provider}</p>
              <p className="text-white/40">
                Připojeno: {b.connected_at ? new Date(b.connected_at).toLocaleDateString('cs-CZ') : '—'}
              </p>
            </div>
          ))}
          {detail.bankConnections.length === 0 && <p className="text-xs text-white/40">Žádná banka nepřipojena.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-white/60">
          Platby ({detail.payments.length})
        </h2>
        <div className="mt-2 space-y-2">
          {detail.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div>
                <p className="font-mono text-[10px] text-white/40">{p.id}</p>
                <p className="text-white/50">{new Date(p.created).toLocaleDateString('cs-CZ')}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-white">{p.amountCzk.toLocaleString('cs-CZ')} Kč</p>
                <p className={p.refunded ? 'text-rose-300' : 'text-emerald-300'}>
                  {p.refunded ? 'Vráceno' : p.status}
                </p>
              </div>
            </div>
          ))}
          {detail.payments.length === 0 && <p className="text-xs text-white/40">Žádné platby (nebo chybí Stripe customer ID).</p>}
        </div>
      </section>
    </div>
  )
}
