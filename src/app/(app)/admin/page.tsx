import { getAdminStats } from '@/utils/adminData'

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

export default async function AdminPage() {
  const stats = await getAdminStats()
  const maxDayCount = Math.max(...stats.registrationsByDay.map((d) => d.count), 1)
  const maxWeekCount = Math.max(...stats.proConversionsByWeek.map((w) => w.count), 1)
  const newLast30Days = stats.registrationsByDay.reduce((sum, d) => sum + d.count, 0)
  const conversionPct = stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-black">Přehled</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Celkem uživatelů</p>
          <p className="mt-1 text-2xl font-black font-mono">{stats.totalUsers}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Aktivní Pro</p>
          <p className="mt-1 text-2xl font-black font-mono text-[var(--accent-primary,#ec4899)]">{stats.proUsers}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">MRR</p>
          <p className="mt-1 text-2xl font-black font-mono text-emerald-300">
            {stats.mrrCzk.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Předplatná celkem</p>
          <p className="mt-1 text-2xl font-black font-mono">{stats.totalSubscriptions}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Noví tento měsíc</p>
          <p className="mt-1 text-2xl font-black font-mono">{stats.newUsersThisMonth}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Churn tento měsíc</p>
          <p className="mt-1 text-2xl font-black font-mono text-rose-300">{stats.churnThisMonth}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider">Registrace po dnech (30 dní)</h2>
          <span className="text-[11px] font-mono text-white/60">celkem {newLast30Days}</span>
        </div>
        <div className="flex items-end gap-[3px]" style={{ height: 80 }}>
          {stats.registrationsByDay.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-t-sm"
              title={`${d.date}: ${d.count}`}
              style={{
                height: `${Math.max((d.count / maxDayCount) * 100, d.count > 0 ? 6 : 2)}%`,
                background: d.count > 0 ? 'linear-gradient(180deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/40">
          <span>{formatDayLabel(stats.registrationsByDay[0].date)}</span>
          <span>{formatDayLabel(stats.registrationsByDay[stats.registrationsByDay.length - 1].date)}</span>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider">Pro konverze po týdnech</h2>
        </div>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {stats.proConversionsByWeek.map((w) => (
            <div key={w.weekLabel} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm"
                title={`${w.weekLabel}: ${w.count}`}
                style={{
                  height: `${Math.max((w.count / maxWeekCount) * 60, w.count > 0 ? 6 : 2)}px`,
                  background: w.count > 0 ? 'linear-gradient(180deg, #34d399, #10b981)' : 'rgba(255,255,255,0.08)',
                }}
              />
              <span className="text-[9px] text-white/40">{w.weekLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider">Konverze na Pro</h2>
          <span className="text-[11px] font-mono text-white/60">{conversionPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
          <div
            style={{ width: `${conversionPct}%`, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }}
            className="h-full"
          />
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          {stats.proUsers} z {stats.totalUsers} {stats.totalUsers === 1 ? 'uživatele' : 'uživatelů'} je na Pro plánu.
        </p>
      </div>
    </div>
  )
}
