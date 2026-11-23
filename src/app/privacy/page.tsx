import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zásady ochrany soukromí — Killsub',
  description: 'Jak Killsub zachází s tvými osobními údaji.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <Link href="/" className="text-sm text-white/60 hover:text-white">← Zpět na úvod</Link>
      <h1 className="mt-6 text-3xl font-bold text-white">Zásady ochrany soukromí</h1>
      <p className="mt-4 text-sm text-white/60">Základní přehled. Plné znění bude doplněno.</p>
      <ul className="mt-6 list-disc space-y-3 pl-5">
        <li>Ukládáme e-mail, údaje o tvých předplatných a nastavení upozornění.</li>
        <li>Propojení banky probíhá přes TrueLayer pouze pro čtení. Přihlašovací údaje k bance nikdy nevidíme ani neukládáme.</li>
        <li>Údaje neprodáváme třetím stranám.</li>
        <li>Svůj účet a data můžeš kdykoli smazat nebo exportovat; v případě dotazů nás kontaktuj na support@killsub.app.</li>
      </ul>
    </main>
  )
}
