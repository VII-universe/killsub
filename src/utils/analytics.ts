import type { SupabaseClient } from '@supabase/supabase-js'

export type AnalyticsEvent =
  | 'subscription_added'
  | 'subscription_deleted'
  | 'import_completed'
  | 'upgrade_clicked'
  | 'upgrade_completed'
  | 'export_downloaded'

// Analytics must never break the primary flow it's attached to — every call
// site fires this without awaiting/propagating failures.
export async function trackEvent(
  supabase: SupabaseClient,
  userId: string,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('analytics_events').insert({ user_id: userId, event, properties: properties || null })
  } catch {
    // ignore — analytics is best-effort
  }
}
