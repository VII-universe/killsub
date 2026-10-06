import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendMonthlyReportEmail, type ReportSubscription } from '@/utils/monthlyReport'
import { logCronRun } from '@/utils/cronLog'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('[cron/monthly-report] RESEND_API_KEY není nastaven — přeskakuji celý běh (graceful no-op).')
    return NextResponse.json({ sent: 0, skipped: 0, errors: ['RESEND_API_KEY chybí'] })
  }

  const admin = createAdminClient()
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`

  const { data: optedInUsers, error: profilesError } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('monthly_report_enabled', true)

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  if (profilesError) {
    errors.push(profilesError.message)
  }

  for (const row of optedInUsers || []) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(row.user_id)
    if (userError || !userData?.user?.email) {
      errors.push(`Chybí e-mail pro uživatele ${row.user_id}`)
      skipped++
      continue
    }

    const { data: rawSubscriptions, error: subsError } = await admin
      .from('subscriptions')
      .select('id, name, amount, currency, billing_cycle, next_payment_date, status, shared, my_share')
      .eq('user_id', row.user_id)

    if (subsError) {
      errors.push(subsError.message)
      skipped++
      continue
    }

    if (!rawSubscriptions || rawSubscriptions.length === 0) {
      skipped++
      continue
    }

    try {
      const didSend = await sendMonthlyReportEmail(userData.user.email, rawSubscriptions as ReportSubscription[], dashboardUrl)
      if (didSend) sent++
      else skipped++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání měsíčního přehledu.')
    }
  }

  await logCronRun(
    'monthly-report',
    errors.length > 0 ? 'error' : 'success',
    `sent=${sent} skipped=${skipped}` + (errors.length > 0 ? ` errors=${errors.join('; ')}` : ''),
    sent
  )

  return NextResponse.json({ sent, skipped, errors })
}
