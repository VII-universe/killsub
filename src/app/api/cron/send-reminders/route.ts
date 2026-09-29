import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Chybí SUPABASE_SERVICE_ROLE_KEY nebo RESEND_API_KEY v prostředí.' },
      { status: 500 }
    )
  }

  const supabase = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`

  const { data: settings, error: settingsError } = await supabase
    .from('notification_settings')
    .select('user_id, days_before')
    .eq('enabled', true)

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

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

  return NextResponse.json({ sent, skipped, errors })
}
