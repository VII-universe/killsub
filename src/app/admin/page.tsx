import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'fidlerjalub@gmail.com'

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const admin = createAdminClient()

  const [usersRes, proRes, subsRes, profilesRes] = await Promise.all([
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('created_at'),
  ])

  const totalUsers = usersRes.count || 0
  const proUsers = proRes.count || 0
  const totalSubscriptions = subsRes.count || 0
  const profiles = profilesRes.data || []

  const now = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    const count = profiles.filter((p) => (p.created_at || '').startsWith(dateStr)).length
    return { date: dateStr, count }
  })

  const maxDayCount = Math.max(...days.map((d) => d.count), 1)
  const newLast30Days = days.reduce((sum, d) => sum + d.count, 0)
  const conversionPct = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0

  return (
    <div className="min-h-screen bg-[#090a0f] text-white px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-black">Killsub Admin</h1>
          <p className="mt-1 text-xs text-white/50">Interní přehled — viditelné pouze pro {ADMIN_EMAIL}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Uživatelé</p>
            <p className="mt-1 text-3xl font-black font-mono">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Pro uživatelé</p>
            <p className="mt-1 text-3xl font-black font-mono text-[var(--accent-primary,#ec4899)]">{proUsers}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Předplatná</p>
            <p className="mt-1 text-3xl font-black font-mono">{totalSubscriptions}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-wider">Nové registrace (30 dní)</h2>
            <span className="text-[11px] font-mono text-white/60">celkem {newLast30Days}</span>
          </div>
          <div className="flex items-end gap-[3px]" style={{ height: 80 }}>
            {days.map((d) => (
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
            <span>{formatDayLabel(days[0].date)}</span>
            <span>{formatDayLabel(days[days.length - 1].date)}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
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
            {proUsers} z {totalUsers} {totalUsers === 1 ? 'uživatele' : 'uživatelů'} je na Pro plánu.
          </p>
        </div>
      </div>
    </div>
  )
}
