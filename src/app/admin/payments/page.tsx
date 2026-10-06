import { getAdminPayments } from '@/utils/adminData'

export default async function AdminPaymentsPage() {
  const { payments, totalThisMonthCzk, totalAllTimeCzk } = await getAdminPayments()
  const refunds = payments.filter((p) => p.refunded)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-black">Platby</h1>

      {payments.length === 0 && !process.env.STRIPE_SECRET_KEY && (
        <p className="text-xs text-amber-300">Chybí STRIPE_SECRET_KEY v prostředí — platby nelze načíst.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Revenue tento měsíc</p>
          <p className="mt-1 text-2xl font-black font-mono text-emerald-300">
            {totalThisMonthCzk.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Revenue celkem</p>
          <p className="mt-1 text-2xl font-black font-mono">{totalAllTimeCzk.toLocaleString('cs-CZ')} Kč</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Refundy</p>
          <p className="mt-1 text-2xl font-black font-mono text-rose-300">{refunds.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-white/50">
              <th className="px-3 py-2.5 font-bold">Datum</th>
              <th className="px-3 py-2.5 font-bold">E-mail</th>
              <th className="px-3 py-2.5 font-bold">Částka</th>
              <th className="px-3 py-2.5 font-bold">Status</th>
              <th className="px-3 py-2.5 font-bold">Payment Intent</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-white/60">{new Date(p.created).toLocaleDateString('cs-CZ')}</td>
                <td className="px-3 py-2.5 text-white/70">{p.email}</td>
                <td className="px-3 py-2.5 font-mono text-white">{p.amountCzk.toLocaleString('cs-CZ')} Kč</td>
                <td className={`px-3 py-2.5 font-bold ${p.refunded ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {p.refunded ? 'Vráceno' : p.status}
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-white/40">{p.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <p className="p-4 text-center text-xs text-white/40">Žádné platby.</p>}
      </div>
    </div>
  )
}
