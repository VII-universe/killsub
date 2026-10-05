import webpush from 'web-push'
import { createAdminClient } from './supabase/admin'

// Server-only (web-push needs Node's crypto, not available on Edge) — every
// route that imports this must declare `export const runtime = 'nodejs'`,
// same as the existing crons that already send push this way.
let vapidConfigured = false
function ensureVapid(): boolean {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return false
  }
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@killsub.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidConfigured = true
  }
  return true
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number }> {
  if (!ensureVapid()) return { sent: 0 }

  const admin = createAdminClient()
  const { data: devices } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!devices || devices.length === 0) return { sent: 0 }

  const payload = JSON.stringify({ title, body, url: url || '/dashboard' })
  let sent = 0

  for (const device of devices) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        payload
      )
      sent++
    } catch (err) {
      const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', device.id)
      }
    }
  }

  return { sent }
}
