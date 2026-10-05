import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { effectiveAmount } from '@/utils/subscriptionCost'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function monthlyAmount(amount: number, billingCycle: string): number {
  return billingCycle === 'yearly' ? amount / 12 : amount
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const { data: rawSubscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('tax_category', 'business')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  const subscriptions = rawSubscriptions || []
  const year = new Date().getFullYear()
  const displayName = user.email || 'Uživatel Killsub'

  let totalMonthly = 0
  const rows = subscriptions
    .map((s) => {
      const effAmount = effectiveAmount(s)
      const monthly = monthlyAmount(effAmount, s.billing_cycle)
      const yearly = monthly * 12
      totalMonthly += monthly

      const addedDate = s.created_at ? new Date(s.created_at).toLocaleDateString('cs-CZ') : '—'

      return `
        <tr>
          <td>${escapeHtml(s.name)}</td>
          <td>Firemní</td>
          <td>${monthly.toLocaleString('cs-CZ')}</td>
          <td>${yearly.toLocaleString('cs-CZ')}</td>
          <td>${escapeHtml(s.currency)}</td>
          <td>${addedDate}</td>
        </tr>
      `
    })
    .join('')

  const totalYearly = totalMonthly * 12
  const generatedAt = new Date().toLocaleDateString('cs-CZ')

  const html = `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="utf-8" />
      <title>Daňový report ${year}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #111;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #555; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: 700; }
        tfoot td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; }
        .footer { margin-top: 32px; font-size: 11px; color: #888; }
        .print-hint { margin-bottom: 20px; font-size: 12px; color: #555; }
        @media print {
          .print-hint { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <p class="print-hint">Pro uložení jako PDF použij Cmd/Ctrl+P → Uložit jako PDF.</p>
      <h1>Přehled firemních předplatných — ${escapeHtml(displayName)} — ${year}</h1>
      <p class="subtitle">Vygenerováno aplikací Killsub.app</p>

      <table>
        <thead>
          <tr>
            <th>Název</th>
            <th>Kategorie</th>
            <th>Částka/měs</th>
            <th>Roční ekvivalent</th>
            <th>Měna</th>
            <th>Datum přidání</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6">Žádná firemní předplatná.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Celkem firemní výdaje</td>
            <td>${totalMonthly.toLocaleString('cs-CZ')} Kč/měs</td>
            <td>${totalYearly.toLocaleString('cs-CZ')} Kč/rok</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <p class="footer">Vygenerováno aplikací Killsub.app — ${generatedAt}</p>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="killsub-danovy-report-${year}.html"`,
    },
  })
}
