'use client'

import { useState } from 'react'
import { SUBSCRIPTION_CATALOG, CatalogItem } from '@/utils/catalog'

export default function CatalogPicker({
  onSelect,
  onClose,
}: {
  onSelect: (item: CatalogItem) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = SUBSCRIPTION_CATALOG.filter((item) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-md p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#140c29]/95 to-[#0b0518]/95 p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Vybrat z katalogu</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white border border-white/10"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat službu…"
          autoFocus
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--accent-primary)]/50"
        />

        {filtered.length === 0 ? (
          <p className="mt-6 text-center text-xs text-white/50">Nic jsme nenašli. Zkus jiný název.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {filtered.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelect(item)
                  onClose()
                }}
                className="flex flex-col items-start gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.06] active:scale-[0.98]"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-bold text-white leading-tight">{item.name}</span>
                <span className="text-[10px] text-white/50">
                  {item.defaultAmount} {item.currency}/měs
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
