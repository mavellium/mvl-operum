import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import prisma from '@/lib/prisma'
import ProjetoFuncoesClient from '@/components/projetos/ProjetoFuncoesClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoFuncoesPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role } = await verifySession()

  // Bloqueio de acesso: Apenas admin e gerente
  if (role !== 'admin' && role !== 'gerente') {
    notFound()
  }

  // Busca o projeto e as funções do banco
  const [projeto, funcoes] = await Promise.all([
    findById(projetoId),
    prisma.role.findMany({
      where: { tenantId }, // Ajuste o where conforme seu schema real (se é por projeto ou tenant)
      orderBy: { nome: 'asc' },
    }),
  ])

  if (!projeto) notFound()

  // Mapeia para o formato que o componente cliente espera
  const cargosIniciais = funcoes.map(f => ({
    id: f.id,
    nome: f.nome
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