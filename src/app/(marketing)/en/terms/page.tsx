import type { Metadata, Viewport } from 'next'
import Legal from '@/components/marketing/Legal'

// Page-level viewport: overrides the root layout's non-scalable one (WCAG 1.4.4).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true, viewportFit: 'cover', themeColor: '#0A0A0C' }


export const metadata: Metadata = { title: 'Killsub — Terms (draft)', robots: { index: false, follow: false } }

export default function Page() {
  return <Legal lang="en" kind="terms" />
}
