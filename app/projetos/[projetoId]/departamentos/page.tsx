import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import { isProjectManager } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ProjetoDepartamentosClient from '@/components/projetos/ProjetoDepartamentosClient'


export const dynamic = 'force-dynamic'

export default async function ProjetoDepartamentosPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  if (role !== 'admin' && !await isProjectManager(userId, projetoId)) {
    notFound()
  }

  // Busca o projeto e os departamentos do banco
  const [projeto, departamentos] = await Promise.all([
    findById(projetoId),
    prisma.departamento.findMany({
      where: { tenantId }, // Ajuste o where conforme seu schema real
      orderBy: { nome: 'asc' },
    }),
  ])

  if (!projeto) notFound()

  // Mapeia para o formato que o componente cliente espera
  const departamentosIniciais = departamentos.map(d => ({
    id: d.id,
    nome: d.nome
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Departamentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as áreas e departamentos da equipe do projeto.</p>
        </div>

        <ProjetoDepartamentosClient
          projetoId={projetoId}
          departamentosIniciais={departamentosIniciais}
        />
        
      </main>
    </div>
  )
}