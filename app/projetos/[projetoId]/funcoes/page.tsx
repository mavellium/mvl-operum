import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectAccess'
import { canProjectPermission } from '@/services/projectAccess'
import { listarFuncoesAssociadas } from '@/services/projetoCadastroService'
import prisma from '@/lib/prisma'
import ProjetoFuncoesClient from '@/components/projetos/ProjetoFuncoesClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Funções' }

export default async function ProjetoFuncoesPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  if (!(await canProjectPermission({ tenantId, role, userId }, projetoId, 'cadastros:gerenciar'))) {
    notFound()
  }

  const [project, funcoes, associadas] = await Promise.all([
    findById(projetoId),
    prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    listarFuncoesAssociadas(projetoId),
  ])

  if (!project) notFound()

  const catalogo = funcoes.map(f => ({
    id: f.id,
    name: f.name,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Funções</h1>
          <p className="text-sm text-gray-500 mt-1">Todas as funções do catálogo global já ficam disponíveis neste projeto. Marcar uma função aqui é opcional e serve só para destacá-la no projeto.</p>
        </div>

        <ProjetoFuncoesClient
          projetoId={projetoId}
          catalogo={catalogo}
          associadasIniciais={associadas}
        />
      </main>
    </div>
  )
}
