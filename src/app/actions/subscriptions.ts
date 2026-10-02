'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isCategory } from '@/utils/categories'
import { FREE_PLAN_SUBSCRIPTION_LIMIT } from '@/utils/plan'

export type SubscriptionState = {
  error?: string
  success?: boolean
  message?: string
  limitReached?: boolean
}

function parseSubscriptionForm(formData: FormData) {
  const name = formData.get('name') as string
  const rawAmount = formData.get('amount') as string
  const currency = (formData.get('currency') as string) || 'CZK'
  const billingCycle = (formData.get('billing_cycle') as string) || 'monthly'
  const nextPaymentDate = formData.get('next_payment_date') as string
  const rawCategory = (formData.get('category') as string) || 'Ostatní'
  const category = isCategory(rawCategory) ? rawCategory : 'Ostatní'
  const lastUsedAt = (formData.get('last_used_at') as string) || null
  const logoUrl = (formData.get('logo_url') as string) || null
  const note = (formData.get('note') as string)?.trim() || null

  const manualScoreEnabled = formData.get('health_score_manual') === 'on'
  const rawScore = formData.get('health_score') as string
  const healthScore = manualScoreEnabled && rawScore ? parseInt(rawScore, 10) : null

  if (!name || !rawAmount) {
    return { error: 'Vyplňte prosím název služby i částku.' }
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Zadejte platnou částku větší než 0.' }
  }

  if (manualScoreEnabled && (isNaN(healthScore as number) || (healthScore as number) < 1 || (healthScore as number) > 100)) {
    return { error: 'Ruční skóre zdraví musí být mezi 1 a 100.' }
  }

  return {
    values: {
      name: name.trim(),
      amount,
      currency,
      billing_cycle: billingCycle,
      next_payment_date: nextPaymentDate || null,
      category,
      last_used_at: lastUsedAt,
      logo_url: logoUrl,
      health_score_manual: manualScoreEnabled,
      health_score: manualScoreEnabled ? healthScore : null,
      note,
    },
  }
}

export async function addSubscription(
  prevState: SubscriptionState | null,
  formData: FormData
): Promise<SubscriptionState> {
  const parsed = parseSubscriptionForm(formData)
  if ('error' in parsed) return { error: parsed.error }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.plan === 'free') {
    const { count } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count || 0) >= FREE_PLAN_SUBSCRIPTION_LIMIT) {
      return {
        error: `Dosáhli jste limitu Free plánu (${FREE_PLAN_SUBSCRIPTION_LIMIT} předplatných).`,
        limitReached: true,
      }
    }
  }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    ...parsed.values,
  })

  if (error) {
    return { error: `Chyba při ukládání: ${error.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true, message: 'Předplatné bylo úspěšně přidáno.' }
}

export async function updateSubscription(
  id: string,
  prevState: SubscriptionState | null,
  formData: FormData
): Promise<SubscriptionState> {
  const parsed = parseSubscriptionForm(formData)
  if ('error' in parsed) return { error: parsed.error }

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
    .update(parsed.values)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: `Chyba při ukládání: ${error.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true, message: 'Předplatné bylo upraveno.' }
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
