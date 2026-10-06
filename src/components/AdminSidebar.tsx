'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Přehled' },
  { href: '/admin/users', label: 'Uživatelé' },
  { href: '/admin/subscriptions', label: 'Předplatná' },
  { href: '/admin/payments', label: 'Platby' },
  { href: '/admin/crons', label: 'Crony' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="border-b border-white/10 bg-white/[0.02] px-5 py-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] text-xs font-black">
          K
        </div>
        <span className="text-sm font-black">Killsub Admin</span>
      </div>

      <nav className="mt-5 flex gap-1.5 overflow-x-auto md:mt-6 md:flex-col md:gap-1 md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                isActive ? 'bg-[var(--accent-primary,#ec4899)]/15 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Link href="/dashboard" className="mt-6 hidden text-[11px] text-white/40 hover:text-white/70 md:block">
        ← Zpět do appky
      </Link>
    </aside>
  )
}
