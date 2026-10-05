import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { fetchRecentTransactions, refreshAccessToken } from '@/utils/trueLayer'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('bank_connections')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'truelayer')
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ error: 'Banka není propojena.' }, { status: 404 })
  }

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
      return NextResponse.json({ error: 'Připojení k bance vypršelo, propojte ji prosím znovu.' }, { status: 401 })
    }
  }

  try {
    const transactions = await fetchRecentTransactions(accessToken)
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('TrueLayer transactions chyba:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nepodařilo se načíst transakce.' },
      { status: 500 }
    )
  }
}
