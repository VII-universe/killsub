import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { detectSubscriptionsFromTransactions, type TrueLayerTransaction } from '@/utils/trueLayer'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const transactions: TrueLayerTransaction[] = Array.isArray(body?.transactions) ? body.transactions : []

  if (transactions.length === 0) {
    return NextResponse.json({ subscriptions: [] })
  }

  try {
    const subscriptions = await detectSubscriptionsFromTransactions(transactions)
    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Chyba při detekci předplatných z transakcí:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nepodařilo se analyzovat transakce.' },
      { status: 500 }
    )
  }
}
