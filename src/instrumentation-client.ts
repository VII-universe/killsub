// Sentry's browser SDK loads only on app routes. The marketing landing (/, /en and the legal drafts) never
// downloads it; a client-side navigation from the landing into the app initialises it on the way.
const MARKETING = /^\/(en)?(\/(privacy|terms))?\/?$/

let loading: Promise<typeof import('@sentry/nextjs')> | null = null
function ensureSentry() {
  if (!loading) {
    loading = import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        debug: false,
      })
      return Sentry
    })
  }
  return loading
}

if (typeof window !== 'undefined' && !MARKETING.test(window.location.pathname)) ensureSentry()

export const onRouterTransitionStart = (href: string, navigationType: string) => {
  const url = new URL(href, window.location.origin)
  if (MARKETING.test(url.pathname) && !loading) return
  ensureSentry().then((Sentry) => Sentry.captureRouterTransitionStart(href, navigationType as Parameters<typeof Sentry.captureRouterTransitionStart>[1]))
}
