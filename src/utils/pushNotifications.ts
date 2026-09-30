import { createClient } from './supabase/client'

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
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Uživatel není přihlášen.' }
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      return { error: error.message }
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

    const supabase = createClient()
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nepodařilo se vypnout push notifikace.' }
  }
}
