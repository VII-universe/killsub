'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications, type Token } from '@capacitor/push-notifications'
import { createClient } from '@/utils/supabase/client'

// Native push registration for the Capacitor-wrapped app only — a no-op on
// the regular web deployment (Capacitor.isNativePlatform() is false there),
// so this is safe to mount unconditionally from the web app's own tree.
export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    let cancelled = false

    const saveToken = async (token: string) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('device_tokens').upsert(
        { user_id: user.id, token, platform },
        { onConflict: 'token' }
      )
    }

    const setup = async () => {
      const registrationListener = await PushNotifications.addListener('registration', (token: Token) => {
        saveToken(token.value)
      })
      const registrationErrorListener = await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration failed:', err)
      })

      if (cancelled) {
        registrationListener.remove()
        registrationErrorListener.remove()
        return null
      }

      const result = await PushNotifications.requestPermissions()
      if (result.receive === 'granted') {
        PushNotifications.register()
      }

      return { registrationListener, registrationErrorListener }
    }

    const listenersPromise = setup()

    return () => {
      cancelled = true
      listenersPromise.then((listeners) => {
        listeners?.registrationListener.remove()
        listeners?.registrationErrorListener.remove()
      })
    }
  }, [])
}
