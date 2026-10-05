import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { fetchRecentTransactions, refreshAccessToken, type TrueLayerTransaction } from '@/utils/trueLayer'
import { detectPriceChanges } from '@/utils/priceChangeDetector'

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

  if (allTransactions.length > 0) {
    await saveNewPriceChangeAlerts(admin, user.id, allTransactions)
  }

  return NextResponse.json({ transactions: allTransactions })
}

async function saveNewPriceChangeAlerts(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  transactions: TrueLayerTransaction[]
) {
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id, name')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const changes = detectPriceChanges(transactions, subscriptions)
  if (changes.length === 0) return

  for (const change of changes) {
    // Skip duplicates: same subscription + same new amount already flagged and not dismissed yet.
    const { data: existing } = await admin
      .from('price_change_alerts')
      .select('id')
      .eq('subscription_id', change.subscriptionId)
      .eq('new_amount', change.newAmount)
      .is('dismissed_at', null)
      .maybeSingle()

    if (existing) continue

    await admin.from('price_change_alerts').insert({
      user_id: userId,
      subscription_id: change.subscriptionId,
      old_amount: change.oldAmount,
      new_amount: change.newAmount,
      currency: change.currency,
      change_percent: change.changePercent,
      detected_at: change.detectedAt,
    })
  }
}
