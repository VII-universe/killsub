import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { trackEvent } from '@/utils/analytics'
import { effectiveAmount } from '@/utils/subscriptionCost'

function escapeCsvField(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function monthlyAmount(amount: number, billingCycle: string): number {
  if (billingCycle === 'yearly') return amount / 12
  if (billingCycle === 'weekly') return amount * 4
  return amount
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const isPro = profile?.plan === 'pro'

  const { data: rawSubscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subscriptions = rawSubscriptions || []

  const cycleLabel = (cycle: string) =>
    cycle === 'yearly' ? 'Ročně' : cycle === 'weekly' ? 'Týdně' : 'Měsíčně'

  let csv: string

  if (isPro) {
    // Killsub doesn't track a subscription status (no soft-delete/cancel state),
    // so the spec's "Stav" column is dropped rather than invented.
    const header = 'Název,Cena (CZK),Frekvence,Kategorie,Příští platba,Poznámka'
    const rows = subscriptions.map((s) =>
      [
        escapeCsvField(s.name),
        effectiveAmount(s),
        cycleLabel(s.billing_cycle),
        escapeCsvField(s.category || ''),
        s.next_payment_date || '',
        escapeCsvField(s.note || ''),
      ].join(',')
    )
    const totalMonthly = subscriptions.reduce(
      (sum, s) => sum + monthlyAmount(effectiveAmount(s), s.billing_cycle),
      0
    )
    const footer = `,,,,Celkem měsíčně,${Math.round(totalMonthly)} Kč`
    csv = [header, ...rows, footer].join('\n')
  } else {
    const header = 'Název,Cena (CZK),Frekvence,Kategorie'
    const rows = subscriptions.map((s) =>
      [escapeCsvField(s.name), effectiveAmount(s), cycleLabel(s.billing_cycle), escapeCsvField(s.category || '')].join(',')
    )
    csv = [header, ...rows].join('\n')
  }

  trackEvent(supabase, user.id, 'export_downloaded', { isPro, count: subscriptions.length })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="killsub-export.csv"',
    },
  })
}
