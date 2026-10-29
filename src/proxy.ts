import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // The marketing landing (/, /en, the legal drafts) and its static scene bundle (/scene/*) must not touch Supabase.
    '/((?!$|en$|privacy$|terms$|en/privacy$|en/terms$|scene/|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
