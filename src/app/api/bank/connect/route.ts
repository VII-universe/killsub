import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { buildAuthUrl, generatePkce, generateState } from '@/utils/trueLayer'

// Node's crypto module (used for PKCE in trueLayer.ts) isn't available on the
// Edge runtime — force Node explicitly rather than relying on the default.
export const runtime = 'nodejs'

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
    console.error('[bank/connect] buildAuthUrl selhal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nepodařilo se připravit připojení k bance.' },
      { status: 500 }
    )
  }

  console.log('[bank/connect] Full auth URL:', authUrl)
  console.log('[bank/connect] Env check - CLIENT_ID present:', !!process.env.TRUELAYER_CLIENT_ID)
  console.log('[bank/connect] Env check - REDIRECT_URI:', process.env.TRUELAYER_REDIRECT_URI)
  console.log('[bank/connect] state:', state, 'code_challenge:', codeChallenge)

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
