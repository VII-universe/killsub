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

  // Fetch the most recent session regardless of status — filtering to
  // status='active' here meant a completed/abandoned session (and therefore
  // its Results or Setup phase) simply vanished from this query the moment
  // it stopped being active, which is the root cause of the blank-page bug.
  const { data: sessions } = await supabase
    .from('detox_sessions')
    .select('id, started_at, ends_at, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const session = sessions?.[0] ?? null

  return <DetoxView subscriptions={subscriptions} session={session} />
}
