import { NextResponse } from 'next/server'
import { getAdminUser } from '@/utils/adminAuth'
import { getAdminStats } from '@/utils/adminData'

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getAdminStats()
  return NextResponse.json(stats)
}
