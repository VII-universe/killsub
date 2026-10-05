import { NextResponse, type NextRequest } from 'next/server'
import { sendPushToUser } from '@/utils/sendPush'

export const runtime = 'nodejs'

// Internal/external trigger endpoint. The crons in this app call
// sendPushToUser() directly in-process instead of hitting this route over
// HTTP — they already run server-side with admin access, so a self-call
// would just be an unnecessary network hop. This route exists for any
// future external or out-of-process trigger, gated the same way the cron
// routes are.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const userId = body?.userId
  const title = body?.title
  const message = body?.body
  const url = body?.url

  if (!userId || !title || !message) {
    return NextResponse.json({ error: 'Chybí userId, title nebo body.' }, { status: 400 })
  }

  const result = await sendPushToUser(userId, title, message, url)
  return NextResponse.json(result)
}
