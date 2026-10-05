import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileDashboardView from '@/components/MobileDashboardView'
import { Subscription } from '@/components/SubscriptionList'
import { isBankConnectionExpiringSoon } from '@/utils/trueLayer'
import type { PriceChangeAlert } from '@/components/PriceChangeAlertBanner'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Načtení předplatných z databáze
  const { data: rawSubscriptions, error: dbError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subscriptions: Subscription[] = rawSubscriptions || []

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, plan_expires_at, referral_code, is_public, import_token, onboarded, monthly_budget, monthly_report_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: benchmark } = await supabase
    .from('spend_benchmarks')
    .select('avg_monthly_czk')
    .eq('category', '_total')
    .maybeSingle()

  // Only counting rows / reading connected_at here — bank_connections.access_token
  // is never selected outside the service-role routes that actually need it.
  const admin = createAdminClient()
  const { data: bankConnections, count: bankConnectionCount } = await admin
    .from('bank_connections')
    .select('connected_at', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('provider', 'truelayer')

  // Graceful fallback for historical rows with no connected_at: skip them
  // entirely rather than warning about a connection we can't actually date.
  // Surface the most urgent (fewest days left) of any expiring connections.
  let bankExpiryWarning: { expired: boolean; daysLeft: number } | null = null
  for (const conn of bankConnections || []) {
    if (!conn.connected_at) continue
    const status = isBankConnectionExpiringSoon(conn.connected_at)
    if (status.expired && (!bankExpiryWarning || status.daysLeft < bankExpiryWarning.daysLeft)) {
      bankExpiryWarning = status
    }
  }

  const { data: rawPriceChangeAlerts } = await supabase
    .from('price_change_alerts')
    .select('id, subscription_id, old_amount, new_amount, currency, change_percent, subscriptions(name)')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .order('detected_at', { ascending: false })

  const priceChangeAlerts: PriceChangeAlert[] = (rawPriceChangeAlerts || [])
    .filter((a): a is typeof a & { subscriptions: { name: string } } => !!a.subscriptions)
    .map((a) => ({
      id: a.id,
      subscriptionId: a.subscription_id,
      subscriptionName: a.subscriptions.name,
      oldAmount: Number(a.old_amount),
      newAmount: Number(a.new_amount),
      currency: a.currency,
      changePercent: Number(a.change_percent),
    }))

  return (
    <MobileDashboardView
      userEmail={user.email}
      subscriptions={subscriptions}
      dbError={dbError}
      importDomain={process.env.KILLSUB_IMPORT_DOMAIN || 'killsub.app'}
      benchmarkMonthlyCzk={benchmark ? Number(benchmark.avg_monthly_czk) : null}
      bankConnectionCount={bankConnectionCount || 0}
      bankExpiryWarning={bankExpiryWarning}
      priceChangeAlerts={priceChangeAlerts}
      profile={
        profile
          ? {
              plan: profile.plan,
              planExpiresAt: profile.plan_expires_at,
              referralCode: profile.referral_code,
              isPublic: profile.is_public,
              importToken: profile.import_token,
              onboarded: !!profile.onboarded,
              monthlyBudget: profile.monthly_budget !== null ? Number(profile.monthly_budget) : null,
              monthlyReportEnabled: profile.monthly_report_enabled !== false,
            }
          : null
      }
    />
  )
}
