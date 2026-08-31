import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import AdminCadastrosClient from '@/components/admin/AdminCadastrosClient'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Cadastros Globais' }

export default async function AdminCadastrosPage() {
  const { tenantId } = await verifySession()

  const [departments, roles] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    }),
    prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, scope: true, description: true },
    }),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Cadastros Globais</h1>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AdminCadastrosClient
          departamentosIniciais={departments}
          funcoesIniciais={roles}
        />
      </main>
    </div>
  )
}
