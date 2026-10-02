import { Subscription } from '@/components/SubscriptionList'
import { computeHealthScore } from './health'
import { effectiveAmount } from './subscriptionCost'

function escapeCsvField(value: string | number): string {
  const str = String(value)
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportSubscriptionsToCsv(subscriptions: Subscription[]) {
  const headers = ['Název', 'Cena', 'Měna', 'Perioda', 'Kategorie', 'Datum příští platby', 'Skóre']
  const rows = subscriptions.map((s) => [
    s.name,
    effectiveAmount(s),
    s.currency,
    s.billing_cycle === 'yearly' ? 'Ročně' : 'Měsíčně',
    s.category || 'Ostatní',
    s.next_payment_date || '',
    computeHealthScore(s),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(';'))
    .join('\n')

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().split('T')[0]

  link.href = url
  link.download = `killsub-export-${date}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
