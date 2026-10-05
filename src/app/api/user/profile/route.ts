import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  let body: { monthly_budget?: number | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 })
  }

  if (!('monthly_budget' in body)) {
    return NextResponse.json({ error: 'Chybí pole monthly_budget.' }, { status: 400 })
  }

  const { monthly_budget } = body

  if (monthly_budget !== null && (typeof monthly_budget !== 'number' || isNaN(monthly_budget) || monthly_budget < 0)) {
    return NextResponse.json({ error: 'Rozpočet musí být kladné číslo nebo null.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ monthly_budget })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, monthly_budget })
}
