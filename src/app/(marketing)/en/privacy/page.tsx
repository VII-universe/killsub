import type { Metadata } from 'next'
import Legal from '@/components/marketing/Legal'

export const metadata: Metadata = { title: 'Killsub — Privacy (draft)', robots: { index: false, follow: false } }

export default function Page() {
  return <Legal lang="en" kind="privacy" />
}
