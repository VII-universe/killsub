import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { isBankConnectionExpiringSoon } from '@/utils/trueLayer'

export const runtime = 'nodejs'

// Fires once, exactly 7 days before the 90-day PSD2 cutoff (ageDays === 83).
const REMINDER_DAYS_LEFT = 7

function renderExpiryReminderEmail(daysLeft: number, dashboardUrl: string) {
  return `
    <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #ec4899, #8b5cf6);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 18px;">Přístup k bance brzy vyprší</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">
        Váš přístup k bance vyprší za ${daysLeft} dní — klikněte pro obnovení.
      </p>
      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
        Obnovit připojení
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
  let skipped = 0
  const errors: string[] = []

  const { data: connections, error: connectionsError } = await supabase
    .from('bank_connections')
    .select('id, user_id, connected_at, expiry_reminder_sent_at')
    .eq('provider', 'truelayer')
    .not('connected_at', 'is', null)

  if (connectionsError) {
    errors.push(connectionsError.message)
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)

    for (const conn of connections || []) {
      if (conn.expiry_reminder_sent_at) {
        skipped++
        continue
      }

      const { daysLeft } = isBankConnectionExpiringSoon(conn.connected_at)
      if (daysLeft > REMINDER_DAYS_LEFT) continue

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(conn.user_id)
      if (userError || !userData?.user?.email) {
        errors.push(`Chybí e-mail pro uživatele ${conn.user_id}`)
        continue
      }

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
          to: userData.user.email,
          subject: 'Váš přístup k bance vyprší za 7 dní',
          html: renderExpiryReminderEmail(REMINDER_DAYS_LEFT, dashboardUrl),
        })

        await supabase
          .from('bank_connections')
          .update({ expiry_reminder_sent_at: new Date().toISOString() })
          .eq('id', conn.id)

        sent++
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Neznámá chyba při odesílání e-mailu o expiraci banky.')
      }
    }
  }

  return NextResponse.json({ sent, skipped, errors })
}
