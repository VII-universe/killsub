'use client'

import { useEffect, useState } from 'react'
import { getReferralStats, ReferralStats } from '@/app/actions/profile'

export default function ReferralPanel({ referralCode }: { referralCode: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    getReferralStats().then(setStats)
  }, [])

  const referralLink = origin ? `${origin}/register?ref=${referralCode}` : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — ignore, the link is still selectable in the input
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div>
        <p className="text-xs font-bold text-white">Pozvat přátele</p>
        <p className="text-[11px] text-white/50 mt-0.5">
          Za každého přítele, který přejde na Pro, získáte měsíc Killsub Pro zdarma.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={referralLink}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-mono text-white/80"
        />
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded-xl theme-accent-btn px-3 py-2 text-[11px] font-black"
        >
          {copied ? '✓ Zkopírováno' : 'Kopírovat'}
        </button>
      </div>

      {stats && (
        <p className="text-[11px] text-white/60">
          Pozval(a) jste <span className="font-black text-white">{stats.invitedCount}</span>{' '}
          {stats.invitedCount === 1 ? 'přítele' : 'přátel'}, získali jste{' '}
          <span className="font-black text-white">{stats.monthsEarned}</span>{' '}
          {stats.monthsEarned === 1 ? 'měsíc' : 'měsíců'} zdarma.
        </p>
      )}
    </div>
  )
}
