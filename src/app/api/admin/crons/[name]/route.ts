import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/utils/adminAuth'

// Each /api/cron/* route bundles its own logic inline in a GET handler — there's
// no shared function to call in-process, so manually triggering one from here
// means a real HTTP call with the same CRON_SECRET those routes already expect.
const VALID_CRONS = ['send-reminders', 'monthly-report', 'bank-expiry-reminder', 'price-alerts', 'detox-check']

export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = await params
  if (!VALID_CRONS.includes(name)) {
    return NextResponse.json({ error: 'Neznámý cron.' }, { status: 400 })
  }

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Chybí CRON_SECRET v prostředí.' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  try {
    const res = await fetch(`${siteUrl}/api/cron/${name}`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const result = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: res.ok, status: res.status, result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Nepodařilo se spustit cron.' },
      { status: 500 }
    )
  }
}
