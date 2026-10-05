export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Push payloads need the VAPID public key as a Uint8Array, but browsers hand it to us
// (and expect it back) as a URL-safe base64 string.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<{ error?: string }> {
  if (!isPushSupported()) {
    return { error: 'Tento prohlížeč nepodporuje push notifikace.' }
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    return { error: 'Chybí konfigurace VAPID klíče.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { error: 'Povolení pro notifikace nebylo uděleno.' }
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    const json = subscription.toJSON()

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: json }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error || 'Nepodařilo se uložit push subscription.' }
    }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nepodařilo se zapnout push notifikace.' }
  }
}

export async function unsubscribeFromPush(): Promise<{ error?: string }> {
  try {
    const subscription = await getExistingPushSubscription()
    if (!subscription) return {}

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error || 'Nepodařilo se smazat push subscription.' }
    }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nepodařilo se vypnout push notifikace.' }
  }
}
