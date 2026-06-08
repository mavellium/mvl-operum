import { verifySession } from '@/lib/dal'
import { listTenants } from '@/services/tenantService'
import { getMyTenantsAction } from '@/app/actions/auth'
import AdminTenantsClient from '@/components/admin/AdminTenantsClient'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminTenantsPage() {
  const { role, userId } = await verifySession()
  if (role !== 'admin') redirect('/projetos')

  const [tenants, myTenants] = await Promise.all([
    listTenants(userId),
    getMyTenantsAction(),
  ])
  const myTenantIds = myTenants.map(t => t.tenantId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie os tenants da plataforma</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AdminTenantsClient
          initialTenants={tenants as Parameters<typeof AdminTenantsClient>[0]['initialTenants']}
          myTenantIds={myTenantIds}
        />
      </main>
    </div>
  )
}
