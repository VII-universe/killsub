import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeCodeForToken } from '@/utils/trueLayer'

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/dashboard', request.nextUrl.origin)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    dashboardUrl.searchParams.set('bank', 'error')
    return NextResponse.redirect(dashboardUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get('tl_state')?.value
  const codeVerifier = request.cookies.get('tl_code_verifier')?.value

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    dashboardUrl.searchParams.set('bank', 'error')
    const response = NextResponse.redirect(dashboardUrl)
    response.cookies.delete('tl_state')
    response.cookies.delete('tl_code_verifier')
    return response
  }

  try {
    const tokens = await exchangeCodeForToken(code, codeVerifier)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const admin = createAdminClient()
    const { error } = await admin.from('bank_connections').insert({
      user_id: user.id,
      provider: 'truelayer',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    })

    if (error) throw new Error(error.message)

    dashboardUrl.searchParams.set('bank', 'connected')
  } catch (error) {
    console.error('TrueLayer callback chyba:', error)
    dashboardUrl.searchParams.set('bank', 'error')
  }

  const response = NextResponse.redirect(dashboardUrl)
  response.cookies.delete('tl_state')
  response.cookies.delete('tl_code_verifier')
  return response
}
