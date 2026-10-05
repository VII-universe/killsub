import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { fetchRecentTransactions, refreshAccessToken, type TrueLayerTransaction } from '@/utils/trueLayer'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('bank_connections')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'truelayer')

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: 'Banka není propojena.' }, { status: 404 })
  }

  // A user can have more than one connected bank — fetch each one's
  // transactions independently (refreshing its token if needed) and merge.
  // One connection failing (e.g. an expired token) shouldn't block the rest.
  const allTransactions: TrueLayerTransaction[] = []
  const errors: string[] = []

  for (const connection of connections) {
    let accessToken = connection.access_token

    const isExpired = connection.expires_at && new Date(connection.expires_at).getTime() < Date.now() + 60_000
    if (isExpired && connection.refresh_token) {
      try {
        const refreshed = await refreshAccessToken(connection.refresh_token)
        accessToken = refreshed.access_token
        await admin
          .from('bank_connections')
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token || connection.refresh_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq('id', connection.id)
      } catch (error) {
        console.error('TrueLayer token refresh chyba:', error)
        errors.push('Připojení k jedné z bank vypršelo, propojte ji prosím znovu.')
        continue
      }
    }

    try {
      allTransactions.push(...(await fetchRecentTransactions(accessToken)))
    } catch (error) {
      console.error('TrueLayer transactions chyba:', error)
      errors.push(error instanceof Error ? error.message : 'Nepodařilo se načíst transakce z jedné z bank.')
    }
  }

  if (allTransactions.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors[0] }, { status: 500 })
  }

  return NextResponse.json({ transactions: allTransactions })
}
