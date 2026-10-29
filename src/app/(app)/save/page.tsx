import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SavingsView from '@/components/SavingsView'
import { Subscription } from '@/components/SubscriptionList'

export default async function SavePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: rawSubscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subscriptions: Subscription[] = rawSubscriptions || []

  return <SavingsView subscriptions={subscriptions} />
}
