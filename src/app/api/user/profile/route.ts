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

  let body: { monthly_budget?: number | null; monthly_report_enabled?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 })
  }

  const updates: Record<string, number | boolean | null> = {}

  if ('monthly_budget' in body) {
    const { monthly_budget } = body
    if (monthly_budget !== null && (typeof monthly_budget !== 'number' || isNaN(monthly_budget) || monthly_budget < 0)) {
      return NextResponse.json({ error: 'Rozpočet musí být kladné číslo nebo null.' }, { status: 400 })
    }
    updates.monthly_budget = monthly_budget ?? null
  }

  if ('monthly_report_enabled' in body) {
    if (typeof body.monthly_report_enabled !== 'boolean') {
      return NextResponse.json({ error: 'monthly_report_enabled musí být true nebo false.' }, { status: 400 })
    }
    updates.monthly_report_enabled = body.monthly_report_enabled
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Chybí pole k aktualizaci.' }, { status: 400 })
  }

  const { error } = await supabase.from('user_profiles').update(updates).eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...updates })
}
