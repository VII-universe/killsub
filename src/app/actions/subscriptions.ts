'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type SubscriptionState = {
  error?: string
  success?: boolean
  message?: string
}

export async function addSubscription(
  prevState: SubscriptionState | null,
  formData: FormData
): Promise<SubscriptionState> {
  const name = formData.get('name') as string
  const rawAmount = formData.get('amount') as string
  const currency = (formData.get('currency') as string) || 'CZK'
  const billingCycle = (formData.get('billing_cycle') as string) || 'monthly'
  const nextPaymentDate = formData.get('next_payment_date') as string

  if (!name || !rawAmount) {
    return { error: 'Vyplňte prosím název služby i částku.' }
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Zadejte platnou částku větší než 0.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: name.trim(),
    amount,
    currency,
    billing_cycle: billingCycle,
    next_payment_date: nextPaymentDate || null,
  })

  if (error) {
    return { error: `Chyba při ukládání: ${error.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true, message: 'Předplatné bylo úspěšně přidáno.' }
}

export async function deleteSubscription(id: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
