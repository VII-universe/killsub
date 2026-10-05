import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { buildAuthUrl, generatePkce, generateState } from '@/utils/trueLayer'

const COOKIE_MAX_AGE = 60 * 10 // 10 minutes — just long enough for the OAuth round trip

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const state = generateState()
  const { codeVerifier, codeChallenge } = generatePkce()

  let authUrl: string
  try {
    authUrl = buildAuthUrl({ state, codeChallenge })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nepodařilo se připravit připojení k bance.' },
      { status: 500 }
    )
  }

  const response = NextResponse.redirect(authUrl)
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
  response.cookies.set('tl_state', state, cookieOpts)
  response.cookies.set('tl_code_verifier', codeVerifier, cookieOpts)
  return response
}
