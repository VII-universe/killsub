'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type AuthState = {
  error?: string
  success?: boolean
  message?: string
}

export async function signIn(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Vyplňte prosím e-mail i heslo.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message === 'Invalid login credentials' ? 'Neplatné přihlašovací údaje.' : error.message }
  }

  redirect('/dashboard')
}

export async function signUp(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Vyplňte prosím e-mail i heslo.' }
  }

  if (password.length < 6) {
    return { error: 'Heslo musí mít alespoň 6 znaků.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Pokud Supabase nevyžaduje potvrzení e-mailu a relace rovnou vznikla
  if (data.session) {
    redirect('/dashboard')
  }

  return {
    success: true,
    message: 'Registrace proběhla úspěšně! Pokud je zapnuté ověření e-mailu, zkontrolujte svou schránku.',
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
