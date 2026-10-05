import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendMonthlyReportEmail, type ReportSubscription } from '@/utils/monthlyReport'

// Self-service "send me my report now" — scoped to the logged-in user only
// (RLS-bound client, no admin access). The bulk monthly send to ALL opted-in
// users lives in /api/cron/monthly-report, gated by CRON_SECRET instead.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const { data: rawSubscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, name, amount, currency, billing_cycle, next_payment_date, status, shared, my_share')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`
  const sent = await sendMonthlyReportEmail(user.email, (rawSubscriptions || []) as ReportSubscription[], dashboardUrl)

  if (!sent) {
    return NextResponse.json({ error: 'E-mailové odesílání není nakonfigurováno.' }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}
