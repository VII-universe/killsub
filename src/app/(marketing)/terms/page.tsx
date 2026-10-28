import type { Metadata } from 'next'
import Legal from '@/components/marketing/Legal'

export const metadata: Metadata = { title: 'Killsub — Podmínky (návrh)', robots: { index: false, follow: false } }

export default function Page() {
  return <Legal lang="cs" kind="terms" />
}
