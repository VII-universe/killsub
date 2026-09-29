import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobileDashboardView from '@/components/MobileDashboardView'
import { Subscription } from '@/components/SubscriptionList'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Načtení předplatných z databáze
  const { data: rawSubscriptions, error: dbError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subscriptions: Subscription[] = rawSubscriptions || []

  return (
    <MobileDashboardView
      userEmail={user.email}
      subscriptions={subscriptions}
      dbError={dbError}
    />
  )
}
