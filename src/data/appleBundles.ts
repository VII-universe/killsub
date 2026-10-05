export interface AppleService {
  name: string
  monthlyPrice: number
}

export const APPLE_SERVICES: AppleService[] = [
  { name: 'Apple TV+', monthlyPrice: 219 },
  { name: 'Apple Music (jednotlivec)', monthlyPrice: 199 },
  { name: 'Apple Music (rodina)', monthlyPrice: 299 },
  { name: 'Apple Arcade', monthlyPrice: 99 },
  { name: 'Apple News+', monthlyPrice: 149 },
  { name: 'iCloud+ 50 GB', monthlyPrice: 29 },
  { name: 'iCloud+ 200 GB', monthlyPrice: 79 },
  { name: 'iCloud+ 2 TB', monthlyPrice: 249 },
  { name: 'Apple One (jednotlivec)', monthlyPrice: 499 },
  { name: 'Apple One (rodina)', monthlyPrice: 699 },
]

// Bank-imported transaction descriptors (e.g. "APPLE.COM/BILL") are generic —
// any Apple charge there is almost certainly the combined bill, so matching
// is broad. A manually-typed name is usually one specific service someone
// picked on purpose ("Apple Music"), so manual entry only offers the split
// when the name itself looks like the generic combined bill.
export function shouldOfferAppleSplit(name: string, source: 'manual' | 'bank'): boolean {
  const lower = name.toLowerCase()
  if (source === 'bank') return lower.includes('apple')
  return lower.includes('apple bill') || lower.includes('apple.com')
}
