import { getAdminSubscriptions } from '@/utils/adminData'
import AdminSubscriptionsTable from '@/components/AdminSubscriptionsTable'

export default async function AdminSubscriptionsPage() {
  const { subscriptions, topNames } = await getAdminSubscriptions()

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-black">Předplatná ({subscriptions.length})</h1>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-white/60">
          Top 10 nejčastějších předplatných
        </h2>
        <div className="space-y-1.5">
          {topNames.map((t, idx) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="w-5 text-[10px] font-mono text-white/30">#{idx + 1}</span>
              <span className="flex-1 text-xs font-bold text-white">{t.name}</span>
              <span className="text-xs font-mono text-white/50">{t.count}×</span>
            </div>
          ))}
          {topNames.length === 0 && <p className="text-xs text-white/40">Zatím žádná data.</p>}
        </div>
      </div>

      <AdminSubscriptionsTable subscriptions={subscriptions} />
    </div>
  )
}
