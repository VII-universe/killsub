import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BankImportClient from './BankImportClient'

export default async function ImportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <BankImportClient />
}
