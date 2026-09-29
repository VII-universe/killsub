'use client'

import { useState } from 'react'

export default function MobileAIHeroCard({
  onOpenForm,
  onOpenAiImport,
  isPro,
}: {
  onOpenForm: () => void
  onOpenAiImport: () => void
  isPro: boolean
}) {
  const [isWaving, setIsWaving] = useState(false)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 shadow-2xl backdrop-blur-2xl transition-all">
      {/* Dynamic ambient background glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[var(--accent-primary)] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[var(--accent-secondary)] opacity-20 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        {/* Text information */}
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-white/90 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span>AI Subscription Assistant</span>
          </div>

          <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Killsub Pro <span className="text-[var(--accent-primary)]">Experience</span>
          </h2>

          <p className="mt-1 text-xs text-white/70 leading-relaxed max-w-xs">
            Hlídám vaše platby, varuji před obnovením a importuji faktury jedním klikem.
          </p>
        </div>

        {/* Friendly AI Robot Mascot Avatar */}
        <div
          onClick={() => setIsWaving(!isWaving)}
          className="group relative flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-white/10 to-white/5 p-1 shadow-xl transition-transform active:scale-95"
          title="Klikněte pro pozdrav"
        >
          {/* Robot SVG Inspired by CareAI Award Winning Design */}
          <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#1b1736] to-[#0c081e]">
            {/* Robot Head */}
            <div className="relative h-12 w-14 rounded-2xl bg-white p-1 shadow-md flex flex-col items-center justify-center">
              {/* Screen Face */}
              <div className="h-7 w-11 rounded-xl bg-[#0d0722] flex items-center justify-center gap-2">
                {/* Glowing Eyes */}
                <span className="h-2.5 w-2 rounded-full bg-[var(--accent-primary)] shadow-sm animate-pulse" />
                <span className="h-2.5 w-2 rounded-full bg-[var(--accent-primary)] shadow-sm animate-pulse" />
              </div>
              {/* Little Ears / Antenna */}
              <div className="absolute -left-1 top-4 h-2 w-1 rounded-l bg-slate-300" />
              <div className="absolute -right-1 top-4 h-2 w-1 rounded-r bg-slate-300" />
            </div>

            {/* Floating PRO Badge */}
            <span className="absolute -bottom-1 rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-white shadow-sm border border-white/20">
              AI PRO
            </span>
          </div>
        </div>
      </div>

      {/* Two Big Mobile Quick Action Buttons (Like CareAI reference: "Scan bill" vs "Enter manually") */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={onOpenForm}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:bg-white/10 active:scale-[0.98] group"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 group-hover:scale-105 transition-transform">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Přidat předplatné</div>
            <div className="text-[11px] text-white/60">Zadat ručně nebo vybrat ze šablony</div>
          </div>
        </button>

        <button
          onClick={onOpenAiImport}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-gradient-to-r from-[var(--accent-primary)]/20 to-purple-600/20 p-3.5 text-left transition-all hover:brightness-110 active:scale-[0.98] group"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/40 group-hover:scale-105 transition-transform">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Skenovat / AI Import</span>
              {isPro ? (
                <span className="rounded bg-pink-500/30 px-1 text-[9px] font-extrabold text-pink-200">GEMINI</span>
              ) : (
                <span className="rounded bg-white/15 px-1 text-[9px] font-extrabold text-white/80">🔒 PRO</span>
              )}
            </div>
            <div className="text-[11px] text-white/70">Zkopírujte e-mail či fakturu</div>
          </div>
        </button>
      </div>
    </div>
  )
}
