export default function BenchmarkBadge({
  userMonthlyCzk,
  benchmarkMonthlyCzk,
}: {
  userMonthlyCzk: number
  benchmarkMonthlyCzk: number | null | undefined
}) {
  if (!benchmarkMonthlyCzk || userMonthlyCzk <= 0) return null

  const diff = Math.round(userMonthlyCzk - benchmarkMonthlyCzk)

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">
        Platíš přesně jako průměr
      </span>
    )
  }

  const isOver = diff > 0

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
        isOver
          ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
          : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      }`}
    >
      Platíš o {Math.abs(diff).toLocaleString('cs-CZ')} Kč {isOver ? 'víc' : 'míň'} než průměr
    </span>
  )
}
