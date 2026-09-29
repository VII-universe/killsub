'use client'

export default function MobileAIHeroCard({
  onOpenForm,
  onOpenAiImport,
  isPro,
}: {
  onOpenForm: () => void
  onOpenAiImport: () => void
  isPro: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-2xl backdrop-blur-2xl transition-all">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--accent-primary)] opacity-20 blur-3xl" />

      <div className="relative z-10 flex items-center gap-2.5 mb-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-base border border-[var(--accent-primary)]/30">
          ✨
        </span>
        <h2 className="text-sm font-black tracking-tight text-white">Přidat předplatné</h2>
      </div>

      <div className="relative z-10 space-y-2">
        <button
          onClick={onOpenForm}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:bg-white/10 active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xs font-bold text-white">Přidat ručně</span>
        </button>

        <button
          onClick={onOpenAiImport}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 p-3.5 text-left shadow-md shadow-purple-500/20 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
            {isPro ? (
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <span className="flex-1 min-w-0 text-xs font-bold text-white truncate">
            AI Import z faktury nebo e-mailu
          </span>
          <span className="flex-shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
            AI
          </span>
        </button>
      </div>
    </div>
  )
}
