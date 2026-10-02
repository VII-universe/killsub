'use client'

import { createClient } from '@/utils/supabase/client'
import { trackEvent, type AnalyticsEvent } from '@/utils/analytics'

export async function trackClientEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await trackEvent(supabase, user.id, event, properties)
  } catch {
    // ignore — analytics is best-effort
  }
}
