'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotificationSettings = {
  enabled: boolean
  days_before: 3 | 7 | 14
}

export type NotificationState = {
  error?: string
  success?: boolean
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { enabled: false, days_before: 3 }

  const { data } = await supabase
    .from('notification_settings')
    .select('enabled, days_before')
    .eq('user_id', user.id)
    .maybeSingle()

  return data ? { enabled: data.enabled, days_before: data.days_before } : { enabled: false, days_before: 3 }
}

export async function updateNotificationSettings(
  prevState: NotificationState | null,
  formData: FormData
): Promise<NotificationState> {
  const enabled = formData.get('enabled') === 'on'
  const daysBefore = parseInt(formData.get('days_before') as string, 10) || 3

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase.from('notification_settings').upsert({
    user_id: user.id,
    enabled,
    days_before: daysBefore,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
