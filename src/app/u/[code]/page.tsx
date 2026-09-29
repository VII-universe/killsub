import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { CATEGORY_COLORS, isCategory } from '@/utils/categories'

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id, is_public')
    .eq('referral_code', code)
    .maybeSingle()

  if (!profile || !profile.is_public) {
    notFound()
  }

  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('amount, currency, billing_cycle, category')
    .eq('user_id', profile.user_id)

  const subs = subscriptions || []

  const currencyCounts: Record<string, number> = {}
  subs.forEach((s) => {
    currencyCounts[s.currency] = (currencyCounts[s.currency] || 0) + 1
  })
  const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CZK'

  const inCurrency = subs.filter((s) => s.currency === dominantCurrency)
  const byCategory: Record<string, number> = {}
  let monthlyTotal = 0

  inCurrency.forEach((s) => {
    const monthly = s.billing_cycle === 'yearly' ? Number(s.amount) / 12 : Number(s.amount)
    monthlyTotal += monthly
    const cat = isCategory(s.category) ? s.category : 'Ostatní'
    byCategory[cat] = (byCategory[cat] || 0) + monthly
  })

  const bars = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      pct: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#64748b',
    }))

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#090a0f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-transparent blur-[140px]" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0d111c]/90 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 p-px">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090a0f]">
              <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
          </div>
          <span className="text-sm font-black tracking-tight text-white font-mono">KILLSUB</span>
        </div>

        <p className="mt-5 text-[11px] uppercase tracking-wider font-bold text-indigo-300">
          Anonymní přehled výdajů
        </p>
        <p className="mt-1 text-4xl font-black font-mono text-white">
          {monthlyTotal.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} {dominantCurrency}
          <span className="text-sm text-white/40">/měs.</span>
        </p>
        <p className="mt-1 text-xs text-white/50">napříč {subs.length} {subs.length === 1 ? 'předplatným' : 'předplatnými'}</p>

        {bars.length > 0 && (
          <div className="mt-6 space-y-2.5">
            {bars.map((b) => (
              <div key={b.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white/80">{b.category}</span>
                  <span className="font-mono text-white/50">{b.pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div style={{ width: `${b.pct}%`, backgroundColor: b.color }} className="h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/register"
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:opacity-95 active:scale-[0.98]"
        >
          Chcete také přehled svých výdajů? Vyzkoušet zdarma →
        </Link>
      </div>
    </div>
  )
}
