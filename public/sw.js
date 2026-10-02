// Killsub service worker — handles incoming Web Push messages and notification taps.
// Registered from src/utils/pushNotifications.ts.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Killsub', body: event.data.text() }
  }

  const title = payload.title || 'Killsub'
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.url || '/dashboard',
      subscriptionId: payload.subscriptionId || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Killsub — offline</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#080313; color:#fff; font-family:system-ui,-apple-system,sans-serif; text-align:center; padding:24px; }
  .card { max-width:320px; }
  .mark { width:48px; height:48px; margin:0 auto 16px; border-radius:14px;
    background:linear-gradient(135deg,#ec4899,#8b5cf6); display:flex; align-items:center; justify-content:center;
    font-weight:900; font-size:20px; }
  h1 { font-size:16px; margin:0 0 8px; }
  p { font-size:13px; color:rgba(255,255,255,0.6); line-height:1.5; margin:0; }
</style></head>
<body><div class="card">
  <div class="mark">K</div>
  <h1>Jsi offline</h1>
  <p>Data se načtou po připojení k internetu.</p>
</div></body></html>`

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode !== 'navigate') return

  const url = new URL(request.url)
  if (!url.pathname.startsWith('/dashboard')) return

  event.respondWith(
    fetch(request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              client.navigate(url)
            } catch {
              // ignore — fall through to focusing the existing tab as-is
            }
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
