'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TaxCategory = 'personal' | 'business' | null

const NEXT_VALUE: Record<string, TaxCategory> = {
  null: 'personal',
  personal: 'business',
  business: null,
}

const STYLES: Record<string, string> = {
  null: 'border border-white/20 text-white/50 bg-transparent',
  personal: 'border border-slate-400/40 bg-slate-500/15 text-slate-300',
  business: 'border border-violet-500/40 bg-violet-500/15 text-violet-300',
}

const LABELS: Record<string, string> = {
  null: 'Neroztříděno',
  personal: 'Osobní',
  business: 'Firemní',
}

export default function TaxCategoryBadge({
  subscriptionId,
  taxCategory,
}: {
  subscriptionId: string
  taxCategory: TaxCategory
}) {
  const router = useRouter()
  const [value, setValue] = useState<TaxCategory>(taxCategory)
  const [isSaving, setIsSaving] = useState(false)
  const key = value ?? 'null'

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving) return

    const next = NEXT_VALUE[key]
    setValue(next)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tax_category: next }),
      })
      if (!res.ok) {
        setValue(value)
      } else {
        router.refresh()
      }
    } catch {
      setValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      title="Klikni pro přepnutí: Neroztříděno → Osobní → Firemní"
      className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider transition-opacity disabled:opacity-60 ${STYLES[key]}`}
    >
      {LABELS[key]}
    </button>
  )
}
