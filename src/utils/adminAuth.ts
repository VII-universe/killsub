import { createClient } from './supabase/server'

export const ADMIN_EMAIL = 'fidlerjalub@gmail.com'

export async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}
