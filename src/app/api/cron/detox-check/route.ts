import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import webpush from 'web-push'
import { createAdminClient } from '@/utils/supabase/admin'
import { monthlyEquivalent } from '@/utils/detox'

export const runtime = 'nodejs'

const MILESTONE_DAYS = [
  { days: 7, column: 'day7_notified_at' as const },
  { days: 14, column: 'day14_notified_at' as const },
  { days: 21, column: 'day21_notified_at' as const },
]

function formatCzk(amount: number): string {
  return `${Math.round(amount).toLocaleString('cs-CZ')} Kč`
}

function renderDetoxCompleteEmail(savedAmount: number, dashboardUrl: string) {
  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #93c5fd, #34d399);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 18px;">Tvůj Detox skončil! 🎉</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">Ušetřil jsi <strong>${formatCzk(savedAmount)}</strong>. Podívej se na výsledky →</p>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #93c5fd, #34d399); color: #0b0518; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Zobrazit výsledky
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
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.app'}/dashboard/detox`

  let completed = 0
  let milestoneNotificationsSent = 0
  let emailsSent = 0
  const errors: string[] = []

  const { data: activeSessions, error: sessionsError } = await supabase
    .from('detox_sessions')
    .select('id, user_id, started_at, ends_at, status, day7_notified_at, day14_notified_at, day21_notified_at')
    .eq('status', 'active')

  if (sessionsError) {
    errors.push(sessionsError.message)
  }

  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@killsub.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }

  for (const session of activeSessions || []) {
    const elapsedDays = Math.floor((Date.now() - new Date(session.started_at).getTime()) / (1000 * 60 * 60 * 24))

    const { data: frozenSubs } = await supabase
      .from('subscriptions')
      .select('amount, billing_cycle, shared, my_share')
      .eq('user_id', session.user_id)
      .eq('detox_paused', true)

    const totalMonthly = (frozenSubs || []).reduce((sum, s) => sum + monthlyEquivalent(s), 0)

    // Weekly milestone push notifications (day 7, 14, 21), gated on whether
    // the user has ever subscribed to push — same opt-in signal the
    // send-reminders cron uses, no separate toggle exists for push.
    for (const milestone of MILESTONE_DAYS) {
      if (elapsedDays < milestone.days || session[milestone.column]) continue

      const savedSoFar = totalMonthly * (milestone.days / 30)

      if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        const { data: devices } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', session.user_id)

        const payload = JSON.stringify({
          title: `Detox: týden ${milestone.days / 7} za tebou`,
          body: `Ušetřil jsi ${formatCzk(savedSoFar)}.`,
          url: '/dashboard/detox',
        })

        for (const device of devices || []) {
          try {
            await webpush.sendNotification(
              { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
              payload
            )
          } catch (err) {
            const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined
            if (statusCode === 404 || statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', device.id)
            } else {
              errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání detox push notifikace.')
            }
          }
        }
      }

      await supabase
        .from('detox_sessions')
        .update({ [milestone.column]: new Date().toISOString() })
        .eq('id', session.id)

      milestoneNotificationsSent++
    }

    // Session finished — flip to completed and send the wrap-up e-mail.
    if (new Date(session.ends_at).getTime() <= Date.now()) {
      await supabase.from('detox_sessions').update({ status: 'completed' }).eq('id', session.id)
      completed++

      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(session.user_id)

        if (!userError && userData?.user?.email) {
          try {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
              to: userData.user.email,
              subject: 'Tvůj Detox skončil!',
              html: renderDetoxCompleteEmail(totalMonthly, dashboardUrl),
            })
            emailsSent++
          } catch (err) {
            errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání detox e-mailu.')
          }
        }
      }
    }
  }

  return NextResponse.json({ completed, milestoneNotificationsSent, emailsSent, errors })
}
