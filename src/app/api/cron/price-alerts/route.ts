import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushToUser } from '@/utils/sendPush'

export const runtime = 'nodejs'

// Detection + persistence already happens on-demand in /api/bank/transactions
// whenever a user's bank data is fetched (via detectPriceChanges). This cron's
// only job is to notify: pick up rows nobody has been emailed about yet
// (notified_at IS NULL) and that haven't already been dismissed, group them
// per user, and send one summary e-mail each — then mark them notified.
function renderPriceAlertsEmail(
  changes: { subscriptionName: string; oldAmount: number; newAmount: number; currency: string; changePercent: number }[],
  dashboardUrl: string
) {
  const items = changes
    .map(
      (c) =>
        `<li style="margin-bottom: 8px;"><strong>${c.subscriptionName}</strong>: ${c.oldAmount.toLocaleString('cs-CZ')} → ${c.newAmount.toLocaleString(
          'cs-CZ'
        )} ${c.currency} (+${c.changePercent} %)</li>`
    )
    .join('')

  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #f59e0b, #ec4899);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 18px;">Zjistili jsme zdražení</h2>
      <ul style="color: #cbd5e1; line-height: 1.6; padding-left: 20px;">${items}</ul>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Zobrazit v Killsub
      </a>
    </div>
  `
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Chybí SUPABASE_SERVICE_ROLE_KEY v prostředí.' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.app'}/dashboard`

  let sent = 0
  const errors: string[] = []

  const { data: alerts, error: alertsError } = await supabase
    .from('price_change_alerts')
    .select('id, user_id, old_amount, new_amount, currency, change_percent, subscriptions(name)')
    .is('notified_at', null)
    .is('dismissed_at', null)

  if (alertsError) {
    errors.push(alertsError.message)
  }

  const byUser = new Map<string, { ids: string[]; changes: { subscriptionName: string; oldAmount: number; newAmount: number; currency: string; changePercent: number }[] }>()

  for (const alert of alerts || []) {
    const subscriptionName = (alert.subscriptions as unknown as { name: string } | null)?.name
    if (!subscriptionName) continue

    const entry = byUser.get(alert.user_id) || { ids: [], changes: [] }
    entry.ids.push(alert.id)
    entry.changes.push({
      subscriptionName,
      oldAmount: Number(alert.old_amount),
      newAmount: Number(alert.new_amount),
      currency: alert.currency,
      changePercent: Number(alert.change_percent),
    })
    byUser.set(alert.user_id, entry)
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  let pushSent = 0

  for (const [userId, entry] of byUser) {
    let notifiedSomehow = false

    if (resend) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
      if (userError || !userData?.user?.email) {
        errors.push(`Chybí e-mail pro uživatele ${userId}`)
      } else {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
            to: userData.user.email,
            subject: 'Zjistili jsme zdražení předplatných',
            html: renderPriceAlertsEmail(entry.changes, dashboardUrl),
          })
          sent++
          notifiedSomehow = true
        } catch (err) {
          errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání e-mailu o zdražení.')
        }
      }
    }

    const pushTitle =
      entry.changes.length === 1
        ? `📈 ${entry.changes[0].subscriptionName} zdražil o ${Math.round(
            entry.changes[0].newAmount - entry.changes[0].oldAmount
          )} ${entry.changes[0].currency}`
        : `📈 ${entry.changes.length} předplatných zdražilo`
    const pushBody = entry.changes.map((c) => c.subscriptionName).join(', ')

    const { sent: devicesSent } = await sendPushToUser(userId, pushTitle, pushBody, dashboardUrl)
    if (devicesSent > 0) {
      pushSent++
      notifiedSomehow = true
    }

    if (notifiedSomehow) {
      await supabase
        .from('price_change_alerts')
        .update({ notified_at: new Date().toISOString() })
        .in('id', entry.ids)
    }
  }

  return NextResponse.json({ sent, pushSent, errors })
}
