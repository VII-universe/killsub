import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileDashboardView from '@/components/MobileDashboardView'
import { Subscription } from '@/components/SubscriptionList'

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
    .select('plan, plan_expires_at, referral_code, is_public, import_token, onboarded, monthly_budget')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: benchmark } = await supabase
    .from('spend_benchmarks')
    .select('avg_monthly_czk')
    .eq('category', '_total')
    .maybeSingle()

  // Only checking existence here — bank_connections.access_token is never
  // selected outside the service-role routes that actually need it.
  const admin = createAdminClient()
  const { data: bankConnection } = await admin
    .from('bank_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'truelayer')
    .maybeSingle()

  return (
    <MobileDashboardView
      userEmail={user.email}
      subscriptions={subscriptions}
      dbError={dbError}
      importDomain={process.env.KILLSUB_IMPORT_DOMAIN || 'killsub.app'}
      benchmarkMonthlyCzk={benchmark ? Number(benchmark.avg_monthly_czk) : null}
      bankConnected={!!bankConnection}
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
            }
          : null
      }
    />
  )
}
