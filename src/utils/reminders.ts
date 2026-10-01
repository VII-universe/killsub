import { createClient } from '@/utils/supabase/client'
import { RecommendationType } from '@/utils/savingsRecommendations'

export interface Reminder {
  id: string
  user_id: string
  subscription_id: string | null
  recommendation_type: RecommendationType
  recommendation_title: string
  remind_at: string
  dismissed_at: string | null
  created_at: string
}

export const REMINDER_CACHE_PREFIX = 'ks_reminder_'

export function cacheReminderLocally(recId: string): void {
  try {
    localStorage.setItem(`${REMINDER_CACHE_PREFIX}${recId}`, '1')
  } catch {
    // ignore storage failures
  }
}

export function isReminderCachedLocally(recId: string): boolean {
  try {
    return localStorage.getItem(`${REMINDER_CACHE_PREFIX}${recId}`) !== null
  } catch {
    return false
  }
}

export function clearReminderCacheLocally(recId: string): void {
  try {
    localStorage.removeItem(`${REMINDER_CACHE_PREFIX}${recId}`)
  } catch {
    // ignore storage failures
  }
}

export async function createReminder(params: {
  subscriptionId: string | null
  recommendationType: RecommendationType
  recommendationTitle: string
}): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const remindAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    subscription_id: params.subscriptionId,
    recommendation_type: params.recommendationType,
    recommendation_title: params.recommendationTitle,
    remind_at: remindAt,
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function fetchUpcomingReminders(): Promise<Reminder[]> {
  const supabase = createClient()
  const in1Day = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .is('dismissed_at', null)
    .lte('remind_at', in1Day)
    .order('remind_at', { ascending: true })

  if (error || !data) return []
  return data as Reminder[]
}

export async function dismissReminder(id: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('reminders').update({ dismissed_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  return {}
}
