'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null)

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#090a0f] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-transparent blur-[140px]" />
      </div>

      <div className="relative w-full max-w-[420px] rounded-3xl border border-white/[0.08] bg-[#0d111c]/90 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
        {/* Subtle top edge glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-rose-500/20 border border-white/10 p-0.5 shadow-xl shadow-indigo-500/10">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#090a0f]">
              <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-white font-mono">
            KILLSUB <span className="text-indigo-400 font-sans font-bold text-lg">VII</span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            Přihlaste se ke svému účtu pro správu nákladů
          </p>
        </div>

        {/* Error notification */}
        {state?.error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <svg className="h-4 w-4 text-rose-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{state.error}</span>
          </div>
        )}

        {/* Login form */}
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              E-mailová adresa
            </label>
            <div className="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="vas@email.cz"
                className="block w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:border-indigo-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Heslo
              </label>
            </div>
            <div className="mt-1.5">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="block w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 transition-all focus:border-indigo-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 py-3 px-4 text-xs font-bold tracking-wide text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 hover:shadow-indigo-500/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Ověřuji údaje...</span>
              </div>
            ) : (
              'Přihlásit se do Killsub'
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-white/[0.06] pt-4 text-center text-xs text-slate-400">
          Nemáte ještě účet?{' '}
          <Link href="/register" className="font-semibold text-indigo-400 transition hover:text-indigo-300">
            Zaregistrujte se zdarma
          </Link>
        </div>
      </div>
    </div>
  )
}
