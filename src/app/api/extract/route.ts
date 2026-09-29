import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { extractSubscriptionFromText } from '@/utils/geminiExtract'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile || profile.plan !== 'pro') {
      return NextResponse.json(
        { error: 'AI import faktur je dostupný pouze pro Pro plán.', upgradeRequired: true },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const text = body?.text

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Zadejte prosím text faktury nebo potvrzovacího e-mailu k analýze.' },
        { status: 400 }
      )
    }

    const normalizedData = await extractSubscriptionFromText(text)
    return NextResponse.json(normalizedData)
  } catch (error: any) {
    console.error('Chyba při volání Gemini API:', error)
    return NextResponse.json(
      { error: error?.message || 'Nastala neočekávaná chyba při analýze textu pomocí AI.' },
      { status: 500 }
    )
  }
}
