import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import Stripe from 'stripe'
import { getStripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { trackEvent } from '@/utils/analytics'

// Stripe moved `current_period_end` from the Subscription object onto each SubscriptionItem.
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  return subscription.items.data[0]?.current_period_end ?? null
}

async function grantReferralBonus(admin: ReturnType<typeof createAdminClient>, referredUserId: string) {
  // Flip the flag only if it's currently false — this is the idempotency guard that makes
  // the bonus safe against Stripe webhook retries for the same checkout.session.completed event.
  const { data: claimed } = await admin
    .from('user_profiles')
    .update({ referral_reward_granted: true })
    .eq('user_id', referredUserId)
    .eq('referral_reward_granted', false)
    .select('referred_by')
    .maybeSingle()

  if (!claimed?.referred_by) return

  const { data: referrer } = await admin
    .from('user_profiles')
    .select('user_id, plan, plan_expires_at')
    .eq('referral_code', claimed.referred_by)
    .maybeSingle()

  if (!referrer) return

  const now = new Date()
  const currentExpiry = referrer.plan_expires_at ? new Date(referrer.plan_expires_at) : now
  const base = currentExpiry > now ? currentExpiry : now
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

  await admin
    .from('user_profiles')
    .update({ plan: 'pro', plan_expires_at: newExpiry.toISOString() })
    .eq('user_id', referrer.user_id)
}

async function sendPaymentFailedEmail(email: string, dashboardUrl: string) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
    to: email,
    subject: 'Platba za Killsub Pro se nezdařila',
    html: `
      <div style="font-family: sans-serif; background: #090a0f; color: #fff; padding: 32px; border-radius: 16px;">
        <h2 style="margin: 0 0 12px;">Platba se nezdařila</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Nepodařilo se nám stáhnout platbu za vaše Killsub Pro předplatné. Zkontrolujte prosím platební metodu,
          jinak bude vaše Pro předplatné brzy ukončeno.
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
          Aktualizovat platbu
        </a>
      </div>
    `,
  })
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Chybí Stripe podpis nebo STRIPE_WEBHOOK_SECRET.' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Neplatný webhook podpis: ${err.message}` }, { status: 400 })
  }

  const admin = createAdminClient()
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://killsub.vercel.app'}/dashboard`

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id || session.client_reference_id
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

      if (!userId) break

      let planExpiresAt: string | null = null
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const periodEnd = getSubscriptionPeriodEnd(subscription)
        planExpiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null
      }

      await admin
        .from('user_profiles')
        .update({
          plan: 'pro',
          stripe_customer_id: customerId || undefined,
          stripe_subscription_id: subscriptionId || undefined,
          plan_expires_at: planExpiresAt,
        })
        .eq('user_id', userId)

      await grantReferralBonus(admin, userId)
      trackEvent(admin, userId, 'upgrade_completed', { customerId, subscriptionId })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const periodEnd = getSubscriptionPeriodEnd(subscription)
      if ((subscription.status === 'active' || subscription.status === 'trialing') && periodEnd) {
        await admin
          .from('user_profiles')
          .update({
            plan: 'pro',
            plan_expires_at: new Date(periodEnd * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const { data: churnedProfile } = await admin
        .from('user_profiles')
        .update({ plan: 'free', stripe_subscription_id: null, plan_expires_at: null })
        .eq('stripe_subscription_id', subscription.id)
        .select('user_id')
        .maybeSingle()

      // Tracked for the admin panel's "Churn tento měsíc" metric — only
      // events from this point forward are countable, there's no historical
      // Pro→free transition log to backfill from.
      if (churnedProfile) {
        trackEvent(admin, churnedProfile.user_id, 'subscription_churned', { subscriptionId: subscription.id })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) break

      const { data: profile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (!profile) break

      const { data: userData } = await admin.auth.admin.getUserById(profile.user_id)
      if (userData?.user?.email) {
        await sendPaymentFailedEmail(userData.user.email, dashboardUrl)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
