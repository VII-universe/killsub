'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function applyPriceChangeAlert(
  alertId: string,
  subscriptionId: string,
  newAmount: number
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ amount: newAmount })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (subError) {
    return { error: `Chyba při aktualizaci ceny: ${subError.message}` }
  }

  const { error: alertError } = await supabase
    .from('price_change_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (alertError) {
    return { error: `Chyba při zavírání upozornění: ${alertError.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function dismissPriceChangeAlert(alertId: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase
    .from('price_change_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
