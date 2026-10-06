import { NextResponse } from 'next/server'
import { getAdminUser } from '@/utils/adminAuth'
import { getAdminUsers } from '@/utils/adminData'

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await getAdminUsers()
  return NextResponse.json({ users })
}
