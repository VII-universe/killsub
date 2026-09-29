'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type UserProfile = {
  plan: 'free' | 'pro'
  planExpiresAt: string | null
  referralCode: string
  isPublic: boolean
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('plan, plan_expires_at, referral_code, is_public')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null

  return {
    plan: data.plan,
    planExpiresAt: data.plan_expires_at,
    referralCode: data.referral_code,
    isPublic: data.is_public,
  }
}

export type ReferralStats = {
  referralCode: string
  invitedCount: number
  monthsEarned: number
}

export async function getReferralStats(): Promise<ReferralStats | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('referral_code')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return null

  const { data: referred } = await supabase
    .from('user_profiles')
    .select('referral_reward_granted')
    .eq('referred_by', profile.referral_code)

  const invitedCount = referred?.length || 0
  const monthsEarned = referred?.filter((r) => r.referral_reward_granted).length || 0

  return { referralCode: profile.referral_code, invitedCount, monthsEarned }
}

export async function togglePublicProfile(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const isPublic = formData.get('is_public') === 'on'

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Uživatel není přihlášen.' }
  }

  // Column-level GRANT in the DB only allows updating is_public from here — plan/stripe
  // fields are unreachable from this authenticated client even if the payload were tampered with.
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_public: isPublic })
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
