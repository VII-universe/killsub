'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LABELS: Record<string, string> = {
  admin: 'Přehled',
  users: 'Uživatelé',
  subscriptions: 'Předplatná',
  payments: 'Platby',
  crons: 'Crony',
}

export default function AdminBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="mb-5 flex items-center gap-1.5 text-[11px] text-white/50">
      {segments.map((segment, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/')
        const isLast = idx === segments.length - 1
        const label = LABELS[segment] || segment
        return (
          <span key={href} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-white/20">/</span>}
            {isLast ? (
              <span className="font-bold text-white">{label}</span>
            ) : (
              <Link href={href} className="hover:text-white">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
