import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import webpush from 'web-push'
import { createAdminClient } from '@/utils/supabase/admin'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatCzechDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

function renderReminderEmail(name: string, amount: number, currency: string, daysBefore: number, dashboardUrl: string) {
  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <h2 style="margin: 0 0 12px;">Killsub připomínka</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">
        Za <strong>${daysBefore} ${daysBefore === 1 ? 'den' : daysBefore < 5 ? 'dny' : 'dní'}</strong> se obnoví
        <strong>${name}</strong> za <strong>${amount.toLocaleString('cs-CZ')} ${currency}</strong>.
      </p>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Otevřít Killsub Dashboard
      </a>
    </div>
  `
}

interface RenewalSubscription {
  id: string
  name: string
  amount: number
  currency: string
  next_payment_date: string
}

const PUSH_OFFSETS = [
  { label: '7d', days: 7 },
  { label: '1d', days: 1 },
  { label: '0d', days: 0 },
] as const

function buildPushCopy(offsetLabel: string, sub: RenewalSubscription) {
  const date = formatCzechDate(sub.next_payment_date)
  const amount = `${sub.amount.toLocaleString('cs-CZ')} ${sub.currency}`

  switch (offsetLabel) {
    case '7d':
      return {
        title: `⏰ ${sub.name} se obnovuje za týden`,
        body: `Dne ${date} ti strhnou ${amount}. Chceš pokračovat?`,
      }
    case '1d':
      return {
        title: `⚠️ ${sub.name} se obnovuje zítra`,
        body: `${amount} · ${date}. Klikni pro správu předplatného.`,
      }
    default:
      return {
        title: `💳 ${sub.name} dnes obnovuje`,
        body: `Dnes ti strhnou ${amount} za ${sub.name}.`,
      }
  }
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
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  // ---- E-mail reminders (Resend), per user-configured days_before ----
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, days_before')
      .eq('enabled', true)

    if (settingsError) {
      errors.push(settingsError.message)
    }

    for (const setting of settings || []) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + setting.days_before)
      const targetDateStr = formatDate(targetDate)

      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('id, name, amount, currency, next_payment_date')
        .eq('user_id', setting.user_id)
        .eq('next_payment_date', targetDateStr)

      if (subsError) {
        errors.push(subsError.message)
        continue
      }

      for (const sub of subs || []) {
        const { data: existingLog } = await supabase
          .from('notification_log')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('sent_for_date', targetDateStr)
          .maybeSingle()

        if (existingLog) {
          skipped++
          continue
        }

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(setting.user_id)
        if (userError || !userData?.user?.email) {
          errors.push(`Chybí e-mail pro uživatele ${setting.user_id}`)
          continue
        }

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
            to: userData.user.email,
            subject: `Za ${setting.days_before} dní se obnoví ${sub.name}`,
            html: renderReminderEmail(sub.name, sub.amount, sub.currency, setting.days_before, dashboardUrl),
          })

          await supabase.from('notification_log').insert({
            subscription_id: sub.id,
            sent_for_date: targetDateStr,
          })

          sent++
        } catch (err: any) {
          errors.push(err?.message || 'Neznámá chyba při odesílání e-mailu.')
        }
      }
    }
  }

  // ---- Web Push reminders, fixed 7d/1d/0d offsets for any user with an active subscription ----
  let pushSent = 0
  let pushSkipped = 0

  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@killsub.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const { data: pushRows, error: pushUsersError } = await supabase.from('push_subscriptions').select('user_id')

    if (pushUsersError) {
      errors.push(pushUsersError.message)
    }

    const uniqueUserIds = [...new Set((pushRows || []).map((r) => r.user_id))]

    for (const userId of uniqueUserIds) {
      for (const offset of PUSH_OFFSETS) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + offset.days)
        const targetDateStr = formatDate(targetDate)

        const { data: subs, error: subsError } = await supabase
          .from('subscriptions')
          .select('id, name, amount, currency, next_payment_date')
          .eq('user_id', userId)
          .eq('next_payment_date', targetDateStr)

        if (subsError) {
          errors.push(subsError.message)
          continue
        }

        for (const sub of (subs || []) as RenewalSubscription[]) {
          // Insert-first claims the (subscription, offset, date) slot atomically —
          // the unique constraint makes this the idempotency guard against cron retries.
          const { error: claimError } = await supabase.from('push_notification_log').insert({
            subscription_id: sub.id,
            offset_label: offset.label,
            sent_for_date: targetDateStr,
          })

          if (claimError) {
            pushSkipped++
            continue
          }

          const { data: devices } = await supabase
            .from('push_subscriptions')
            .select('id, endpoint, p256dh, auth')
            .eq('user_id', userId)

          const { title, body } = buildPushCopy(offset.label, sub)
          const payload = JSON.stringify({ title, body, url: dashboardUrl, subscriptionId: sub.id })

          for (const device of devices || []) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: device.endpoint,
                  keys: { p256dh: device.p256dh, auth: device.auth },
                },
                payload
              )
              pushSent++
            } catch (err) {
              const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined
              if (statusCode === 404 || statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', device.id)
              } else {
                errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání push notifikace.')
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ sent, skipped, pushSent, pushSkipped, errors })
}
