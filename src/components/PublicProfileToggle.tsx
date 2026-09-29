'use client'

import { useActionState, useEffect, useState } from 'react'
import { togglePublicProfile } from '@/app/actions/profile'

export default function PublicProfileToggle({
  referralCode,
  initialIsPublic,
}: {
  referralCode: string
  initialIsPublic: boolean
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [origin, setOrigin] = useState('')
  const [state, formAction, isPending] = useActionState(togglePublicProfile, null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const publicUrl = origin ? `${origin}/u/${referralCode}` : ''

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="pr-3">
          <p className="text-xs font-bold text-white">Veřejný přehled výdajů</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            Zveřejní anonymní souhrn (celková útrata, počet služeb, kategorie) — bez názvů konkrétních služeb.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            name="is_public"
            checked={isPublic}
            onChange={(e) => {
              setIsPublic(e.target.checked)
              e.currentTarget.form?.requestSubmit()
            }}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-white/10 peer-checked:bg-[var(--accent-primary)] rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {isPublic && publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-mono text-[var(--accent-primary)] hover:underline"
        >
          {publicUrl}
        </a>
      )}

      {state?.error && <p className="text-[11px] text-rose-300">{state.error}</p>}
      {isPending && <p className="text-[11px] text-white/40">Ukládám...</p>}
    </form>
  )
}
