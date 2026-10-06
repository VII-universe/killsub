import { createAdminClient } from './supabase/admin'
import { getStripe } from './stripe'

const PRO_PRICE_CZK = 149

export interface AdminStats {
  totalUsers: number
  proUsers: number
  mrrCzk: number
  totalSubscriptions: number
  newUsersThisMonth: number
  churnThisMonth: number
  registrationsByDay: { date: string; count: number }[]
  proConversionsByWeek: { weekLabel: string; count: number }[]
}

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient()

  const [usersRes, proRes, subsRes, profilesRes, churnRes] = await Promise.all([
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('created_at'),
    admin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event', 'subscription_churned')
      .gte('created_at', startOfMonthIso()),
  ])

  const totalUsers = usersRes.count || 0
  const proUsers = proRes.count || 0
  const totalSubscriptions = subsRes.count || 0
  const profiles = profilesRes.data || []
  const churnThisMonth = churnRes.count || 0

  const now = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    const count = profiles.filter((p) => (p.created_at || '').startsWith(dateStr)).length
    return { date: dateStr, count }
  })

  const newUsersThisMonth = profiles.filter((p) => (p.created_at || '') >= startOfMonthIso()).length

  // Weekly Pro-upgrade counts over the last ~8 weeks, from the
  // 'upgrade_completed' events the Stripe webhook already fires.
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
  const { data: upgradeEvents } = await admin
    .from('analytics_events')
    .select('created_at')
    .eq('event', 'upgrade_completed')
    .gte('created_at', eightWeeksAgo.toISOString())

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const count = (upgradeEvents || []).filter((e) => {
      const t = new Date(e.created_at).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length
    return { weekLabel: `${weekStart.getDate()}.${weekStart.getMonth() + 1}.`, count }
  })

  return {
    totalUsers,
    proUsers,
    mrrCzk: proUsers * PRO_PRICE_CZK,
    totalSubscriptions,
    newUsersThisMonth,
    churnThisMonth,
    registrationsByDay: days,
    proConversionsByWeek: weeks,
  }
}

export interface AdminUserRow {
  id: string
  email: string
  createdAt: string | null
  lastSignInAt: string | null
  subscriptionCount: number
  isPro: boolean
  stripeCustomerId: string | null
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient()

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const { data: profiles } = await admin.from('user_profiles').select('user_id, plan, stripe_customer_id')
  const { data: subs } = await admin.from('subscriptions').select('user_id')

  const profileByUserId = new Map((profiles || []).map((p) => [p.user_id, p]))
  const subCountByUserId = new Map<string, number>()
  for (const s of subs || []) {
    subCountByUserId.set(s.user_id, (subCountByUserId.get(s.user_id) || 0) + 1)
  }

  return (authUsers?.users || []).map((u) => {
    const profile = profileByUserId.get(u.id)
    return {
      id: u.id,
      email: u.email || '(bez e-mailu)',
      createdAt: u.created_at || null,
      lastSignInAt: u.last_sign_in_at || null,
      subscriptionCount: subCountByUserId.get(u.id) || 0,
      isPro: profile?.plan === 'pro',
      stripeCustomerId: profile?.stripe_customer_id || null,
    }
  })
}

export interface AdminUserDetail extends AdminUserRow {
  subscriptions: {
    id: string
    name: string
    amount: number
    currency: string
    billing_cycle: string
    category: string
    status: string | null
    created_at?: string
  }[]
  bankConnections: { id: string; provider: string; connected_at: string | null; expires_at: string | null }[]
  payments: { id: string; amountCzk: number; status: string; created: string; refunded: boolean }[]
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const admin = createAdminClient()

  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  if (!authUser?.user) return null

  const [{ data: profile }, { data: subscriptions }, { data: bankConnections }] = await Promise.all([
    admin.from('user_profiles').select('plan, stripe_customer_id').eq('user_id', userId).maybeSingle(),
    admin
      .from('subscriptions')
      .select('id, name, amount, currency, billing_cycle, category, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin
      .from('bank_connections')
      .select('id, provider, connected_at, expires_at')
      .eq('user_id', userId),
  ])

  let payments: AdminUserDetail['payments'] = []
  if (profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe()
      const charges = await stripe.charges.list({ customer: profile.stripe_customer_id, limit: 20 })
      payments = charges.data.map((c) => ({
        id: c.id,
        amountCzk: c.amount / 100,
        status: c.status,
        created: new Date(c.created * 1000).toISOString(),
        refunded: c.refunded,
      }))
    } catch {
      // Stripe lookup is best-effort for this detail view — don't fail the whole page over it.
    }
  }

  return {
    id: authUser.user.id,
    email: authUser.user.email || '(bez e-mailu)',
    createdAt: authUser.user.created_at || null,
    lastSignInAt: authUser.user.last_sign_in_at || null,
    subscriptionCount: subscriptions?.length || 0,
    isPro: profile?.plan === 'pro',
    stripeCustomerId: profile?.stripe_customer_id || null,
    subscriptions: subscriptions || [],
    bankConnections: bankConnections || [],
    payments,
  }
}

export interface AdminSubscriptionRow {
  id: string
  userEmail: string
  name: string
  amount: number
  currency: string
  category: string
  createdAt: string | null
}

export async function getAdminSubscriptions(): Promise<{
  subscriptions: AdminSubscriptionRow[]
  topNames: { name: string; count: number }[]
}> {
  const admin = createAdminClient()

  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, user_id, name, amount, currency, category, created_at')
    .order('created_at', { ascending: false })

  const userIds = [...new Set((subs || []).map((s) => s.user_id))]
  const emailByUserId = new Map<string, string>()
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data?.user?.email) emailByUserId.set(id, data.user.email)
    })
  )

  const subscriptions: AdminSubscriptionRow[] = (subs || []).map((s) => ({
    id: s.id,
    userEmail: emailByUserId.get(s.user_id) || '(neznámý uživatel)',
    name: s.name,
    amount: Number(s.amount),
    currency: s.currency,
    category: s.category,
    createdAt: s.created_at || null,
  }))

  const nameCounts = new Map<string, number>()
  for (const s of subscriptions) {
    nameCounts.set(s.name, (nameCounts.get(s.name) || 0) + 1)
  }
  const topNames = [...nameCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { subscriptions, topNames }
}

export interface CronLogRow {
  cronName: string
  ranAt: string
  status: string | null
  message: string | null
  usersAffected: number
}

export async function getLatestCronLogs(): Promise<Record<string, CronLogRow>> {
  const admin = createAdminClient()
  const { data } = await admin.from('cron_logs').select('*').order('ran_at', { ascending: false }).limit(200)

  const latestByName: Record<string, CronLogRow> = {}
  for (const row of data || []) {
    if (latestByName[row.cron_name]) continue
    latestByName[row.cron_name] = {
      cronName: row.cron_name,
      ranAt: row.ran_at,
      status: row.status,
      message: row.message,
      usersAffected: row.users_affected || 0,
    }
  }
  return latestByName
}

export interface AdminPayment {
  id: string
  email: string
  amountCzk: number
  status: string
  created: string
  refunded: boolean
}

export async function getAdminPayments(): Promise<{ payments: AdminPayment[]; totalThisMonthCzk: number; totalAllTimeCzk: number }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { payments: [], totalThisMonthCzk: 0, totalAllTimeCzk: 0 }
  }

  const stripe = getStripe()
  const admin = createAdminClient()

  const charges = await stripe.charges.list({ limit: 100 })
  const { data: profiles } = await admin.from('user_profiles').select('user_id, stripe_customer_id')

  // Map Stripe customer id -> our user's e-mail via the Auth admin API,
  // since Stripe charges only carry the customer id, not our user record.
  const emailByCustomerId = new Map<string, string>()
  for (const profile of profiles || []) {
    if (!profile.stripe_customer_id) continue
    const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id)
    if (authUser?.user?.email) emailByCustomerId.set(profile.stripe_customer_id, authUser.user.email)
  }

  const monthStart = new Date(startOfMonthIso()).getTime() / 1000

  const payments: AdminPayment[] = charges.data.map((c) => {
    const customerId = typeof c.customer === 'string' ? c.customer : c.customer?.id
    return {
      id: c.id,
      email: (customerId && emailByCustomerId.get(customerId)) || '(neznámý zákazník)',
      amountCzk: c.amount / 100,
      status: c.status,
      created: new Date(c.created * 1000).toISOString(),
      refunded: c.refunded,
    }
  })

  const succeeded = charges.data.filter((c) => c.status === 'succeeded' && !c.refunded)
  const totalThisMonthCzk = succeeded.filter((c) => c.created >= monthStart).reduce((sum, c) => sum + c.amount / 100, 0)
  const totalAllTimeCzk = succeeded.reduce((sum, c) => sum + c.amount / 100, 0)

  return { payments, totalThisMonthCzk, totalAllTimeCzk }
}
