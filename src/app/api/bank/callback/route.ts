import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeCodeForToken } from '@/utils/trueLayer'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/dashboard', request.nextUrl.origin)

  console.log('[bank/callback] Query params:', Object.fromEntries(request.nextUrl.searchParams))
  console.log('[bank/callback] Has error param:', request.nextUrl.searchParams.get('error'))

  // TrueLayer redirects back here with ?error=...&error_description=... when
  // the auth step itself fails (bad client config, denied consent, etc.) —
  // this was previously silently swallowed into the generic validation-failed
  // branch below, hiding whatever TrueLayer actually said went wrong.
  const oauthError = request.nextUrl.searchParams.get('error')
  if (oauthError) {
    console.error(
      '[bank/callback] TrueLayer returned an OAuth error:',
      oauthError,
      request.nextUrl.searchParams.get('error_description')
    )
    dashboardUrl.searchParams.set('bank', 'error')
    const response = NextResponse.redirect(dashboardUrl)
    response.cookies.delete('tl_state')
    response.cookies.delete('tl_code_verifier')
    return response
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log('[bank/callback] no authenticated user — aborting')
    dashboardUrl.searchParams.set('bank', 'error')
    return NextResponse.redirect(dashboardUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get('tl_state')?.value
  const codeVerifier = request.cookies.get('tl_code_verifier')?.value

  console.log('[bank/callback] code present:', !!code, 'state match:', state === storedState, 'code_verifier present:', !!codeVerifier)

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    console.log('[bank/callback] validation failed', { hasCode: !!code, hasState: !!state, hasStoredState: !!storedState, hasCodeVerifier: !!codeVerifier })
    dashboardUrl.searchParams.set('bank', 'error')
    const response = NextResponse.redirect(dashboardUrl)
    response.cookies.delete('tl_state')
    response.cookies.delete('tl_code_verifier')
    return response
  }

  try {
    const tokens = await exchangeCodeForToken(code, codeVerifier)
    console.log('[bank/callback] token exchange ok, expires_in:', tokens.expires_in, 'has refresh_token:', !!tokens.refresh_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const admin = createAdminClient()
    const { error } = await admin.from('bank_connections').insert({
      user_id: user.id,
      provider: 'truelayer',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    })

    if (error) throw new Error(error.message)

    dashboardUrl.searchParams.set('bank', 'connected')
  } catch (error) {
    console.error('[bank/callback] chyba:', error)
    dashboardUrl.searchParams.set('bank', 'error')
  }

  const response = NextResponse.redirect(dashboardUrl)
  response.cookies.delete('tl_state')
  response.cookies.delete('tl_code_verifier')
  return response
}
