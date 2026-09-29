'use client'

import { useState } from 'react'

export default function ImportSettingsPanel({
  importToken,
  importDomain,
  isPro,
}: {
  importToken: string
  importDomain: string
  isPro: boolean
}) {
  const [copied, setCopied] = useState(false)
  const importEmail = `import-${importToken}@${importDomain}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(importEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — the address is still selectable in the input
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">Import přeposláním e-mailu</p>
        {isPro && (
          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-300 border border-indigo-500/40">
            Pro
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/50">
        Přepošlete fakturu nebo potvrzení platby na tuto adresu a Killsub ji automaticky zpracuje pomocí AI.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={importEmail}
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

      {!isPro && (
        <p className="text-[11px] text-amber-300">
          Na Free plánu funguje import jen do limitu 5 předplatných — po jeho dosažení vám pošleme e-mail s výzvou k přechodu na Pro.
        </p>
      )}
    </div>
  )
}
