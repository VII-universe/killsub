import { NextResponse, type NextRequest } from 'next/server'
import { Webhook } from 'svix'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { extractSubscriptionFromText } from '@/utils/geminiExtract'
import { isCategory, suggestCategory } from '@/utils/categories'
import { FREE_PLAN_SUBSCRIPTION_LIMIT } from '@/utils/plan'

interface InboundEmailPayload {
  to?: unknown
  subject?: string
  text?: string
  html?: string
}

function extractEmailAddress(to: unknown): string | null {
  if (typeof to === 'string') return to
  if (Array.isArray(to)) {
    const first = to[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'email' in first) return String((first as { email: unknown }).email)
  }
  if (to && typeof to === 'object' && 'email' in to) return String((to as { email: unknown }).email)
  return null
}

async function sendLimitReachedEmail(email: string, dashboardUrl: string) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
    to: email,
    subject: 'E-mail se nepodařilo zpracovat — limit Free plánu',
    html: `
      <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
        <h2 style="margin: 0 0 12px;">Dosáhli jste limitu Free plánu</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Přeposlaný e-mail jsme nezpracovali, protože máte na Free plánu už ${FREE_PLAN_SUBSCRIPTION_LIMIT}
          předplatných. Přejděte na Pro pro neomezený import.
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
          Přejít na Pro
        </a>
      </div>
    `,
  })
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Chybí RESEND_INBOUND_SECRET.' }, { status: 500 })
  }

  const rawBody = await request.text()

  let payload: { data?: InboundEmailPayload } & InboundEmailPayload
  try {
    const svixId = request.headers.get('svix-id') || ''
    const svixTimestamp = request.headers.get('svix-timestamp') || ''
    const svixSignature = request.headers.get('svix-signature') || ''

    const wh = new Webhook(secret)
    // verify() only validates the signature and throws on failure — it does not return the payload.
    wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Neplatný webhook podpis.' }, { status: 400 })
  }

  const email = payload.data || payload
  const toAddress = extractEmailAddress(email.to)

  if (!toAddress) {
    // Nothing we can route this to — acknowledge so Resend doesn't retry.
    return NextResponse.json({ received: true, skipped: 'no-recipient' })
  }

  const tokenMatch = toAddress.match(/^import-([a-f0-9]+)@/i)
  if (!tokenMatch) {
    return NextResponse.json({ received: true, skipped: 'no-import-token-in-address' })
  }
  const importToken = tokenMatch[1]

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id, plan')
    .eq('import_token', importToken)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ received: true, skipped: 'unknown-import-token' })
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`

  if (profile.plan !== 'pro') {
    const { count } = await admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)

    if ((count || 0) >= FREE_PLAN_SUBSCRIPTION_LIMIT) {
      const { data: userData } = await admin.auth.admin.getUserById(profile.user_id)
      if (userData?.user?.email) {
        await sendLimitReachedEmail(userData.user.email, dashboardUrl)
      }
      return NextResponse.json({ received: true, skipped: 'free-plan-limit-reached' })
    }
  }

  const bodyText = email.text || email.html || ''
  const fullText = `${email.subject || ''}\n\n${bodyText}`.trim()

  if (!fullText) {
    return NextResponse.json({ received: true, skipped: 'empty-body' })
  }

  let extracted
  try {
    extracted = await extractSubscriptionFromText(fullText)
  } catch (err) {
    console.error('Gemini extrakce z inbound e-mailu selhala:', err)
    return NextResponse.json({ received: true, skipped: 'extraction-failed' })
  }

  if (!extracted.name || extracted.amount <= 0) {
    return NextResponse.json({ received: true, skipped: 'no-subscription-detected' })
  }

  // Idempotency: without a dedicated inbound-events log, we treat a same-named subscription
  // already created for this user today as a duplicate delivery/retry of the same e-mail.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', profile.user_id)
    .ilike('name', extracted.name)
    .gte('created_at', startOfDay.toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, skipped: 'duplicate' })
  }

  const category = suggestCategory(extracted.name)

  await admin.from('subscriptions').insert({
    user_id: profile.user_id,
    name: extracted.name,
    amount: extracted.amount,
    currency: extracted.currency,
    billing_cycle: extracted.billing_cycle,
    next_payment_date: extracted.next_payment_date || null,
    category: isCategory(category) ? category : 'Ostatní',
  })

  return NextResponse.json({ received: true, created: true })
}
