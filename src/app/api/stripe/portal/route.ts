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

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Nemáte aktivní předplatné Pro.' }, { status: 400 })
  }

  const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`
  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
