import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Podmínky používání — Killsub',
  description: 'Podmínky používání služby Killsub.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <Link href="/" className="text-sm text-white/60 hover:text-white">← Zpět na úvod</Link>
      <h1 className="mt-6 text-3xl font-bold text-white">Podmínky používání</h1>
      <p className="mt-4 text-sm text-white/60">Základní přehled. Plné znění bude doplněno.</p>
      <ul className="mt-6 list-disc space-y-3 pl-5">
        <li>Killsub slouží k přehledu a správě předplatných; neprovádí za tebe platby ani rušení u poskytovatelů.</li>
        <li>Odhady úspor a doporučení AI jsou orientační.</li>
        <li>Za správnost zadaných údajů odpovídá uživatel.</li>
        <li>Dotazy: support@killsub.app.</li>
      </ul>
    </main>
  )
}
