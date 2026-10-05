'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { DETOX_DURATION_DAYS } from '@/utils/detox'

type ActionResult = { error?: string; success?: boolean }

export async function startDetoxSession(freezeIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { data: existing } = await supabase
    .from('detox_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return { error: 'Detox už běží.' }
  }

  if (freezeIds.length === 0) {
    return { error: 'Vyber alespoň jedno předplatné ke zmrazení.' }
  }

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + DETOX_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const { error: insertError } = await supabase.from('detox_sessions').insert({
    user_id: user.id,
    started_at: startedAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'active',
  })

  if (insertError) {
    return { error: insertError.message }
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ detox_paused: true })
    .eq('user_id', user.id)
    .in('id', freezeIds)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}

export async function endDetoxEarly(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase
    .from('detox_sessions')
    .update({ status: 'completed', ends_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}

// "Zrušit vše najednou" — cancel the subscriptions the user said they didn't
// miss, and unfreeze every other still-frozen subscription since the detox
// period is over either way.
export async function finishDetoxCancelMissed(sessionId: string, cancelIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  if (cancelIds.length > 0) {
    const { error: cancelError } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', detox_paused: false })
      .eq('user_id', user.id)
      .in('id', cancelIds)

    if (cancelError) {
      return { error: cancelError.message }
    }
  }

  const { error: unfreezeError } = await supabase
    .from('subscriptions')
    .update({ detox_paused: false })
    .eq('user_id', user.id)
    .eq('detox_paused', true)

  if (unfreezeError) {
    return { error: unfreezeError.message }
  }

  await supabase
    .from('detox_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}

// "Obnovit vše a pokračovat" — unfreeze everything, nothing gets cancelled.
export async function finishDetoxRestoreAll(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ detox_paused: false })
    .eq('user_id', user.id)
    .eq('detox_paused', true)

  if (error) {
    return { error: error.message }
  }

  await supabase
    .from('detox_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}
