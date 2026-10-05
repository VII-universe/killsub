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

// Ending early skips the "did you miss it?" survey entirely — status goes
// straight to 'abandoned' (closed, no results to show) rather than
// 'completed' (which means "Results phase, survey pending").
export async function endDetoxEarly(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error: sessionError } = await supabase
    .from('detox_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (sessionError) {
    return { error: sessionError.message }
  }

  const { error: unfreezeError } = await supabase
    .from('subscriptions')
    .update({ detox_paused: false })
    .eq('user_id', user.id)
    .eq('detox_paused', true)

  if (unfreezeError) {
    return { error: unfreezeError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}

// Server-side flip for a session whose 30 days are up but a cron hasn't
// reached it yet — lets a user who clicks the completion e-mail land on
// status='completed' immediately instead of waiting for the next cron run.
export async function markDetoxCompletedIfExpired(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  const { error } = await supabase
    .from('detox_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .lte('ends_at', new Date().toISOString())

  if (error) {
    return { error: error.message }
  }

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

  // Resolved — close the cycle so the next visit lands on Setup, not stuck
  // showing this same Results screen forever (status stays 'completed' only
  // while the survey is still pending).
  await supabase
    .from('detox_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])

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
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/detox')
  return { success: true }
}
