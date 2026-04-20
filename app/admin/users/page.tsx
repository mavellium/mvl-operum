import { listAllUsers } from '@/services/adminService'
import AdminUsersClient from '@/components/admin/AdminUsersClient'
import { verifySession } from '@/lib/dal'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const { tenantId } = await verifySession()
  const users = await listAllUsers(tenantId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/sprints" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Gerenciar Usuários</h1>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AdminUsersClient initialUsers={users} />
      </main>
    </div>
  )
}
