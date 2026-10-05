'use client'

import { useState } from 'react'
import { APPLE_SERVICES, type AppleService } from '@/data/appleBundles'

export default function AppleBillSplitModal({
  detectedName,
  detectedAmount,
  onAddAsBill,
  onAddSelected,
  onClose,
}: {
  detectedName: string
  detectedAmount: number
  onAddAsBill: () => void
  onAddSelected: (services: AppleService[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectedServices = APPLE_SERVICES.filter((s) => selected.has(s.name))
  const total = selectedServices.reduce((sum, s) => sum + s.monthlyPrice, 0)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Rozdělit Apple Bill?</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-white/60 leading-relaxed">
          Apple účtuje všechny služby dohromady jako &quot;Apple Bill&quot; — &quot;{detectedName}&quot;,{' '}
          {detectedAmount.toLocaleString('cs-CZ')} Kč. Pokud víš, co přesně platíš, můžeš to rozdělit na jednotlivé služby.
        </p>

        <div className="mt-4 space-y-1.5">
          {APPLE_SERVICES.map((service) => (
            <label
              key={service.name}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 cursor-pointer hover:bg-white/[0.06]"
            >
              <input
                type="checkbox"
                checked={selected.has(service.name)}
                onChange={() => toggle(service.name)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent-primary)]"
              />
              <span className="flex-1 text-xs font-bold text-white">{service.name}</span>
              <span className="text-xs font-mono font-bold text-white/60">
                {service.monthlyPrice.toLocaleString('cs-CZ')} Kč
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <span className="text-xs font-bold text-white/70">Součet vybraných</span>
          <span className="text-sm font-mono font-black text-[var(--accent-primary)]">
            {total.toLocaleString('cs-CZ')} Kč
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => onAddSelected(selectedServices)}
            disabled={selectedServices.length === 0}
            className="w-full rounded-2xl theme-accent-btn py-3 text-xs font-black tracking-wide disabled:opacity-50"
          >
            Přidat vybrané služby ({selectedServices.length})
          </button>
          <button
            type="button"
            onClick={onAddAsBill}
            className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-white hover:bg-white/10"
          >
            Přidat jako Apple Bill ({detectedAmount.toLocaleString('cs-CZ')} Kč)
          </button>
        </div>
      </div>
    </div>
  )
}
