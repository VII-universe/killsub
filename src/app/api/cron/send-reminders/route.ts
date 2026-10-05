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
  const amountStr = `${amount.toLocaleString('cs-CZ')} ${currency}`
  const headline =
    daysBefore === 1
      ? `Zítra ti strhnou ${amountStr} za ${name}.`
      : daysBefore === 7
      ? `Za týden ti strhnou ${amountStr} za ${name}.`
      : `Za ${daysBefore} ${daysBefore < 5 ? 'dny' : 'dní'} se obnoví <strong>${name}</strong> za <strong>${amountStr}</strong>.`

  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #ec4899, #8b5cf6);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 18px;">Killsub připomínka</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">${headline}</p>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Otevřít Killsub Dashboard
      </a>
    </div>
  `
}

function renderTrialEndingEmail(name: string, amount: number, currency: string, daysLeft: number, dashboardUrl: string) {
  const amountStr = `${amount.toLocaleString('cs-CZ')} ${currency}`
  const headline =
    daysLeft <= 0
      ? `Pozor — tvůj trial <strong>${name}</strong> končí dnes, jinak ti strhnou <strong>${amountStr}</strong>.`
      : `Pozor — tvůj trial <strong>${name}</strong> končí za ${daysLeft} ${daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}, jinak ti strhnou <strong>${amountStr}</strong>.`

  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #f59e0b, #ec4899);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 18px;">Trial brzy končí</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">${headline}</p>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Spravovat v Killsub
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
  { label: '3d', days: 3 },
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
    case '3d':
      return {
        title: `⏰ ${sub.name} se obnovuje za 3 dny`,
        body: `Dne ${date} ti strhnou ${amount}.`,
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
      // Email reminders are a Pro feature (the settings toggle is already
      // Pro-gated in the UI) — re-check here too, in case a user downgraded
      // after enabling it, leaving a stale enabled=true row behind.
      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('user_id', setting.user_id)
        .maybeSingle()

      if (!senderProfile || senderProfile.plan !== 'pro') {
        continue
      }

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

  // ---- Trial-ending e-mails: any 'trial' subscription renewing within 7 days, once per day ----
  let trialSent = 0

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const todayStr = formatDate(new Date())
    const trialWindowEnd = new Date()
    trialWindowEnd.setDate(trialWindowEnd.getDate() + 7)
    const trialWindowEndStr = formatDate(trialWindowEnd)

    const { data: trialSubs, error: trialSubsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, name, amount, currency, next_payment_date')
      .eq('status', 'trial')
      .not('next_payment_date', 'is', null)
      .lte('next_payment_date', trialWindowEndStr)
      .gte('next_payment_date', todayStr)

    if (trialSubsError) {
      errors.push(trialSubsError.message)
    }

    for (const sub of trialSubs || []) {
      const { data: existingLog } = await supabase
        .from('notification_log')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('sent_for_date', todayStr)
        .maybeSingle()

      if (existingLog) {
        skipped++
        continue
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(sub.user_id)
      if (userError || !userData?.user?.email) {
        errors.push(`Chybí e-mail pro uživatele ${sub.user_id}`)
        continue
      }

      const daysLeft = Math.round(
        (new Date(sub.next_payment_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      )

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
          to: userData.user.email,
          subject: `Tvůj trial ${sub.name} brzy končí`,
          html: renderTrialEndingEmail(sub.name, sub.amount, sub.currency, daysLeft, dashboardUrl),
        })

        await supabase.from('notification_log').insert({
          subscription_id: sub.id,
          sent_for_date: todayStr,
        })

        trialSent++
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání e-mailu o trialu.')
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

  // ---- Push for "Připomenout za 30 dní" reminders (from /save recommendations) ----
  let remindersSent = 0

  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@killsub.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const now = new Date()
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000)

    const { data: dueReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, user_id, recommendation_title')
      .is('dismissed_at', null)
      .lte('remind_at', now.toISOString())
      .gt('remind_at', windowStart.toISOString())

    if (remindersError) {
      errors.push(remindersError.message)
    }

    for (const reminder of dueReminders || []) {
      const { data: devices } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', reminder.user_id)

      const payload = JSON.stringify({
        title: 'Killsub připomíná 🔔',
        body: reminder.recommendation_title,
        url: '/save',
        data: { url: '/save' },
      })

      for (const device of devices || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: device.endpoint,
              keys: { p256dh: device.p256dh, auth: device.auth },
            },
            payload
          )
          remindersSent++
        } catch (err) {
          const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', device.id)
          } else {
            errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání push připomínky.')
          }
        }
      }
    }
  }

  return NextResponse.json({ sent, skipped, trialSent, pushSent, pushSkipped, remindersSent, errors })
}
