import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute = request.nextUrl.pathname === '/' ||
                        request.nextUrl.pathname === '/login' ||
                        request.nextUrl.pathname === '/register' ||
                        request.nextUrl.pathname === '/try' ||
                        request.nextUrl.pathname.startsWith('/auth/') ||
                        request.nextUrl.pathname.startsWith('/api/cron/') ||
                        request.nextUrl.pathname === '/api/push/send' ||
                        request.nextUrl.pathname.startsWith('/api/stripe/webhook') ||
                        request.nextUrl.pathname.startsWith('/api/email/inbound') ||
                        request.nextUrl.pathname.startsWith('/api/analytics') ||
                        request.nextUrl.pathname.startsWith('/u/') ||
                        request.nextUrl.pathname === '/robots.txt' ||
                        request.nextUrl.pathname === '/sitemap.xml'

  if (!user && !isPublicRoute) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Neautorizovaný přístup' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
