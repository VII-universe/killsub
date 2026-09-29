import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getStripe } from '@/utils/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const interval = body?.interval === 'yearly' ? 'yearly' : 'monthly'
  const priceId = interval === 'yearly' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY

  if (!priceId) {
    return NextResponse.json(
      { error: 'Chybí STRIPE_PRICE_MONTHLY/STRIPE_PRICE_YEARLY v prostředí.' },
      { status: 500 }
    )
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const stripe = getStripe()
  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await admin.from('user_profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id)
  }

  const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  })

  return NextResponse.json({ url: session.url })
}
