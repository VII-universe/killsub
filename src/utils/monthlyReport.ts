import { Resend } from 'resend'
import { effectiveAmount } from './subscriptionCost'

export interface ReportSubscription {
  id: string
  name: string
  amount: number
  currency: string
  billing_cycle: string
  next_payment_date: string | null
  status?: string | null
  shared?: boolean | null
  my_share?: number | null
}

function monthlyAmount(sub: ReportSubscription): number {
  const amt = effectiveAmount(sub)
  if (sub.billing_cycle === 'yearly') return amt / 12
  if (sub.billing_cycle === 'weekly') return amt * 4
  return amt
}

const MONTH_NAMES_CS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
]

export function buildMonthlyReport(allSubscriptions: ReportSubscription[]) {
  const subscriptions = allSubscriptions.filter((s) => s.status !== 'cancelled')

  const totalsByCurrency: Record<string, number> = {}
  for (const sub of subscriptions) {
    const cur = sub.currency || 'CZK'
    totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + monthlyAmount(sub)
  }

  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const renewingNextMonth = subscriptions.filter((s) => {
    if (!s.next_payment_date) return false
    const d = new Date(s.next_payment_date)
    return d.getFullYear() === nextMonth.getFullYear() && d.getMonth() === nextMonth.getMonth()
  })

  return { subscriptions, totalsByCurrency, renewingNextMonth, monthLabel: MONTH_NAMES_CS[now.getMonth()] }
}

export function renderMonthlyReportEmail(
  subscriptions: ReportSubscription[],
  totalsByCurrency: Record<string, number>,
  renewingNextMonth: ReportSubscription[],
  monthLabel: string,
  dashboardUrl: string
): string {
  const totalsHtml = Object.entries(totalsByCurrency)
    .map(([cur, amount]) => `<strong style="color:#ec4899;">${Math.round(amount).toLocaleString('cs-CZ')} ${cur}</strong>`)
    .join(' + ')

  const rowsHtml = subscriptions
    .map((sub) => {
      const amt = monthlyAmount(sub)
      return `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08); color:#fff; font-size:13px;">${sub.name}</td>
          <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08); color:#cbd5e1; font-size:13px; text-align:right;">${Math.round(amt).toLocaleString('cs-CZ')} ${sub.currency}/měs.</td>
        </tr>`
    })
    .join('')

  const renewalWarning =
    renewingNextMonth.length > 0
      ? `
        <div style="margin-top:20px; padding:14px 16px; border-radius:12px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3);">
          <p style="margin:0; color:#fbbf24; font-size:12px; font-weight:bold;">⚠️ Příští měsíc se obnoví:</p>
          <p style="margin:6px 0 0; color:#fde68a; font-size:12px; line-height:1.5;">${renewingNextMonth.map((s) => s.name).join(', ')}</p>
        </div>`
      : ''

  return `
    <div style="font-family: sans-serif; background: #080313; color: #fff; padding: 32px; border-radius: 16px; max-width: 480px; margin: 0 auto;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #ec4899, #8b5cf6);"></div>
        <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.2px;">Killsub</span>
      </div>

      <h2 style="margin: 0 0 6px; font-size: 18px;">Měsíční přehled — ${monthLabel}</h2>
      <p style="color: #9094AD; font-size: 13px; margin: 0 0 20px;">Tvoje aktuální předplatná a kolik tě měsíčně stojí.</p>

      <div style="padding: 16px; border-radius: 14px; background: rgba(236,72,153,0.08); border: 1px solid rgba(236,72,153,0.25); text-align:center; margin-bottom: 20px;">
        <p style="margin:0; color:#9094AD; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Celkem měsíčně</p>
        <p style="margin:6px 0 0; font-size:22px;">${totalsHtml || '0 CZK'}</p>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        ${rowsHtml}
      </table>

      ${renewalWarning}

      <a href="${dashboardUrl}" style="display: inline-block; margin-top: 24px; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 13px;">
        Otevřít Killsub Dashboard
      </a>

      <p style="margin-top:24px; color:#555972; font-size:10px;">
        Tenhle e-mail dostáváš, protože máš zapnutý měsíční přehled v nastavení Killsub. Můžeš ho kdykoliv vypnout.
      </p>
    </div>
  `
}

export async function sendMonthlyReportEmail(email: string, subscriptions: ReportSubscription[], dashboardUrl: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[monthlyReport] RESEND_API_KEY není nastaven — e-mail se neodešle (graceful no-op).')
    return false
  }

  const { totalsByCurrency, renewingNextMonth, monthLabel, subscriptions: activeSubs } = buildMonthlyReport(subscriptions)

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Killsub <onboarding@resend.dev>',
    to: email,
    subject: `Tvůj měsíční přehled předplatných — ${monthLabel}`,
    html: renderMonthlyReportEmail(activeSubs, totalsByCurrency, renewingNextMonth, monthLabel, dashboardUrl),
  })

  return true
}
