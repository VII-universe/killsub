'use client'

import { useEffect, useState } from 'react'
import {
  isPushSupported,
  getExistingPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/utils/pushNotifications'

export default function PushNotificationsPanel() {
  const [supported, setSupported] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false)
      setLoading(false)
      return
    }
    getExistingPushSubscription().then((sub) => {
      setEnabled(!!sub)
      setLoading(false)
    })
  }, [])

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true)
    setError(null)

    const result = checked ? await subscribeToPush() : await unsubscribeFromPush()

    if (result.error) {
      setError(result.error)
    } else {
      setEnabled(checked)
    }
    setIsToggling(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
        <div className="h-4 w-48 bg-white/10 rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="pr-3">
          <p className="text-xs font-bold text-white">Push upozornění před obnovením</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {supported
              ? 'Notifikace 7 dní, 1 den a v den obnovení předplatného přímo do tohoto prohlížeče.'
              : 'Tento prohlížeč push notifikace nepodporuje.'}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!supported || isToggling}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-white/10 peer-checked:bg-[var(--accent-primary)] rounded-full transition-colors peer-disabled:opacity-40" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  )
}
