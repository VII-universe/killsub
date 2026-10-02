import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { AnalyticsEvent } from '@/utils/analytics'

// Only anonymous, guest-mode events are allowed through this route — anything
// tied to a real user goes through trackEvent() with the user's own session.
const ALLOWED_ANONYMOUS_EVENTS: AnalyticsEvent[] = ['guest_subscription_added']

export async function POST(request: NextRequest) {
  let body: { event?: string; properties?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 })
  }

  if (!ALLOWED_ANONYMOUS_EVENTS.includes(body.event as AnalyticsEvent)) {
    return NextResponse.json({ error: 'Neznámá událost.' }, { status: 400 })
  }

  const admin = createAdminClient()
  try {
    await admin.from('analytics_events').insert({
      user_id: null,
      event: body.event,
      properties: body.properties || null,
    })
  } catch {
    // analytics is best-effort — never fail the guest flow over a tracking error
  }

  return NextResponse.json({ ok: true })
}
