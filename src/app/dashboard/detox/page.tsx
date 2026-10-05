import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Subscription } from '@/components/SubscriptionList'
import DetoxView from '@/components/DetoxView'

export default async function DetoxPage() {
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

  const { data: session } = await supabase
    .from('detox_sessions')
    .select('id, started_at, ends_at, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  return <DetoxView subscriptions={subscriptions} session={session} />
}
