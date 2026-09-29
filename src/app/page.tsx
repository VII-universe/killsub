import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#090a0f] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Dynamic ambient backdrop light */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-b from-indigo-600/20 via-purple-600/15 to-transparent blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[500px] rounded-full bg-rose-600/10 blur-[180px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#090a0f]/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 p-px shadow-lg shadow-indigo-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-[#090a0f]">
                <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white font-mono">KILLSUB</span>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                VII
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 transition-all hover:text-white"
            >
              Přihlášení
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 hover:shadow-indigo-500/40 active:scale-95"
            >
              Vyzkoušet zdarma
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Release badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>Fáze 2: Gemini AI integrace aktivní</span>
        </div>

        {/* Hero headline */}
        <h1 className="max-w-4xl text-4xl sm:text-6xl font-black tracking-tight text-white">
          Mějte pod kontrolou každou korunu z vašich předplatných.
        </h1>
        <p className="mt-6 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">
          Killsub VII přináší ultra rychlé rozhraní inspirované moderními nástroji jako Linear a Raycast.
          Vložte text faktury nebo e-mailu a nechte umělou inteligenci Gemini vyplnit všechny parametry během sekundy.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-500/30 transition-all hover:opacity-95 hover:shadow-indigo-500/50 active:scale-[0.98]"
          >
            <span>Začít spravovat předplatná</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <span>Otevřít Dashboard</span>
          </Link>
        </div>

        {/* Visual Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full text-left">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d111c]/60 p-5 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">Gemini 1.5 Flash AI</h3>
            <p className="mt-1 text-xs text-slate-400">
              Automaticky vyčte cenu, měnu, periodu i datum příští platby z jakékoliv zkopírované faktury.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0d111c]/60 p-5 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">Chytrá metrika útrat</h3>
            <p className="mt-1 text-xs text-slate-400">
              Automatická normalizace měsíčních i ročních částek, hlídání termínů a odpočet dní do další platby.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0d111c]/60 p-5 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">Supabase SSR Security</h3>
            <p className="mt-1 text-xs text-slate-400">
              Přísné zabezpečení přes Row Level Security a Next.js Server Components. Vaše data vidíte pouze vy.
            </p>
          </div>
        </div>
      </main>

      {/* Pricing Section */}
      <section className="relative z-10 px-6 py-20 border-t border-white/[0.06] bg-[#090a0f]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Jednoduché ceny, bez skrytých poplatků
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Začněte zdarma a přejděte na Pro, jakmile budete potřebovat neomezená předplatná a AI import faktur.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {/* Free Plan */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0d111c]/60 p-8 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Free</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">0 Kč</span>
                <span className="text-xs text-slate-500">/ napořád</span>
              </p>
              <p className="mt-2 text-xs text-slate-400">Pro první kroky se správou předplatných.</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Max. 5 předplatných
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Ruční přidávání a úpravy
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Kategorie a zdravotní skóre
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <span>✕</span> Gemini AI import faktur
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <span>✕</span> E-mailové notifikace
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <span>✕</span> Cashflow kalendář
                </li>
              </ul>

              <Link
                href="/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.08]"
              >
                Vyzkoušet zdarma
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/60 to-purple-950/40 p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
              <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                Nejoblíbenější
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Pro</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">149 Kč</span>
                <span className="text-xs text-slate-400">/ měsíc</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">nebo 1 290 Kč ročně (ušetříte 2 měsíce)</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li className="flex items-center gap-2.5">
                  <span className="text-indigo-400">✓</span> Neomezená předplatná
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-indigo-400">✓</span> Gemini AI import faktur
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-indigo-400">✓</span> E-mailové notifikace před obnovou
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-indigo-400">✓</span> Cashflow kalendář
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-indigo-400">✓</span> Sdílení přehledu jako obrázek
                </li>
              </ul>

              <Link
                href="/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:opacity-95 hover:shadow-indigo-500/50 active:scale-[0.98]"
              >
                Vyzkoušet zdarma
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#090a0f]/60 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Killsub VII. Inspirováno moderními rozhraními Linear, Raycast a Copilot Money.</p>
      </footer>
    </div>
  );
}
