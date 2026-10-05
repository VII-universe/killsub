import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const VALID_TAX_CATEGORIES = ['personal', 'business', null]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !VALID_TAX_CATEGORIES.includes(body.tax_category)) {
    return NextResponse.json({ error: 'Neplatná hodnota tax_category.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ tax_category: body.tax_category })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
