import { NextResponse } from 'next/server'
import { getAdminUser } from '@/utils/adminAuth'
import { getAdminUserDetail } from '@/utils/adminData'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const detail = await getAdminUserDetail(id)
  if (!detail) {
    return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
