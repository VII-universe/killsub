'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RunCronButton({ name }: { name: string }) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/crons/${name}`, { method: 'POST' })
      const data = await res.json()
      setResult(res.ok ? 'Spuštěno ✓' : `Chyba: ${data.error || res.status}`)
      router.refresh()
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Nepodařilo se spustit.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={isRunning}
        className="rounded-xl theme-accent-btn px-3 py-1.5 text-[11px] font-black disabled:opacity-50"
      >
        {isRunning ? 'Spouštím…' : 'Spustit'}
      </button>
      {result && <span className="text-[11px] text-white/60">{result}</span>}
    </div>
  )
}
