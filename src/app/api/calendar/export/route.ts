import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface IcsSubscription {
  id: string
  name: string
  amount: number
  currency: string
  billing_cycle: string
  next_payment_date: string | null
}

// RFC 5545 §3.3.11 TEXT escaping — backslash, semicolon, comma, and newline
// all need escaping inside a text value.
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Calendar DATE values (DTSTART;VALUE=DATE) have no timezone concept — format
// using local calendar components, not toISOString(), which converts to UTC
// and silently shifts the date back a day in any timezone ahead of UTC (the
// same class of bug fixed earlier for the subscription-card due-date badge).
function formatIcsDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// `new Date('2026-11-10')` parses a bare date string as UTC midnight, which
// formatIcsDate's local getters would then read back incorrectly in any
// timezone behind UTC. Parse as a local calendar date instead so the two
// always agree, regardless of which timezone the process runs in.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// DTSTAMP, unlike DTSTART;VALUE=DATE, is a real UTC timestamp by definition —
// toISOString() is the correct tool here, not a bug.
function formatIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function firstOfNextMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

function buildVEvent(sub: IcsSubscription): string {
  const startDate = sub.next_payment_date ? parseDateOnly(sub.next_payment_date) : firstOfNextMonth()
  const dtstart = formatIcsDate(startDate)
  const dtstamp = formatIcsTimestamp(new Date())
  const freq = sub.billing_cycle === 'yearly' ? 'YEARLY' : 'MONTHLY'

  return [
    'BEGIN:VEVENT',
    `UID:${sub.id}@killsub.vercel.app`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `RRULE:FREQ=${freq}`,
    `SUMMARY:${escapeIcsText(sub.name)}`,
    `DESCRIPTION:${escapeIcsText(`${sub.amount.toLocaleString('cs-CZ')} ${sub.currency}`)}`,
    'END:VEVENT',
  ].join('\r\n')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
  }

  const idsParam = request.nextUrl.searchParams.get('ids')
  const all = request.nextUrl.searchParams.get('all') === 'true'

  let query = supabase
    .from('subscriptions')
    .select('id, name, amount, currency, billing_cycle, next_payment_date')
    .eq('user_id', user.id)

  if (!all) {
    const ids = (idsParam || '').split(',').map((id) => id.trim()).filter(Boolean)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Chybí seznam předplatných k exportu.' }, { status: 400 })
    }
    query = query.in('id', ids)
  }

  const { data: subscriptions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = (subscriptions || []).map(buildVEvent).join('\r\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Killsub//Subscriptions//CS',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="killsub-subscriptions.ics"',
    },
  })
}
