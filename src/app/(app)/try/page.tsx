import type { Metadata } from 'next'
import GuestDemo from '@/components/GuestDemo'

export const metadata: Metadata = {
  title: 'Vyzkoušej Killsub zdarma',
  description: 'Přidej svá předplatná a hned uvidíš kolik tě měsíčně a ročně stojí — bez registrace, bez karty.',
}

export default function TryPage() {
  return <GuestDemo />
}
