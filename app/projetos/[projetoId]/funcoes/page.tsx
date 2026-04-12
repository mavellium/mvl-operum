import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ProjetoFuncoesClient from '@/components/projetos/ProjetoFuncoesClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoFuncoesPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  if (role !== 'admin' && !await isProjectManager(userId, projetoId)) {
    notFound()
  }

  const [project, funcoes] = await Promise.all([
    findById(projetoId),
    prisma.role.findMany({
      where: { tenantId, deletedAt: null, scope: 'PROJETO' },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!project) notFound()

  const cargosIniciais = funcoes.map(f => ({
    id: f.id,
    name: f.name,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Funções</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os papéis disponíveis para a equipe do projeto.</p>
        </div>

        <ProjetoFuncoesClient
          projetoId={projetoId}
          cargosIniciais={cargosIniciais}
        />
      </main>
    </div>
  )
}
