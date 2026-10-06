import { redirect } from 'next/navigation'
import { getAdminUser, ADMIN_EMAIL } from '@/utils/adminAuth'
import AdminSidebar from '@/components/AdminSidebar'
import AdminBreadcrumb from '@/components/AdminBreadcrumb'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()

  if (!user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080313] text-white md:flex">
      <AdminSidebar />
      <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <p className="mb-4 text-[11px] text-white/40">Admin — přihlášen jako {ADMIN_EMAIL}</p>
        <AdminBreadcrumb />
        {children}
      </main>
    </div>
  )
}
