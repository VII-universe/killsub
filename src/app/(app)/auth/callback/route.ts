import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'
  const ref = searchParams.get('ref')

  if (code) {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // OAuth metadata can't carry our custom `ref` field the way email/password signUp does,
      // so for Google sign-ins we attach the referral here instead, once the session exists.
      if (ref && user) {
        const admin = createAdminClient()
        const { data: profile } = await admin
          .from('user_profiles')
          .select('referral_code, referred_by')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profile && !profile.referred_by && profile.referral_code !== ref) {
          const { data: referrer } = await admin
            .from('user_profiles')
            .select('user_id')
            .eq('referral_code', ref)
            .maybeSingle()

          if (referrer) {
            await admin.from('user_profiles').update({ referred_by: ref }).eq('user_id', user.id)
          }
        }
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  return NextResponse.redirect(`${siteUrl}/login?error=oauth`)
}
