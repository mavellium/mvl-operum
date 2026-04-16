import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ProjetoStakeholdersClient from '@/components/projetos/ProjetoStakeholdersClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoStakeholdersPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  // DEBUG — remover após confirmar que a rota está acessível
  console.log('[stakeholders] projetoId:', projetoId)
  console.log('[stakeholders] userId:', userId, '| role:', role, '| tenantId:', tenantId)

  const isManager = role === 'admin' || await isProjectManager(userId, projetoId)

  // DEBUG — identifica se a validação de permissão está bloqueando o acesso
  console.log('[stakeholders] isManager:', isManager)

  if (!isManager) {
    console.warn('[stakeholders] notFound() disparado por falta de permissão — userId:', userId, 'projetoId:', projetoId)
    notFound()
  }

  const userRole: 'admin' | 'gerente' = role === 'admin' ? 'admin' : 'gerente'

  const [project, projectStakeholders, allGlobalStakeholders] = await Promise.all([
    findById(projetoId),
    prisma.projectStakeholder.findMany({
      where: { projectId: projetoId },
      include: { stakeholder: true },
      orderBy: { stakeholder: { name: 'asc' } },
    }),
    prisma.stakeholder.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // DEBUG — identifica se o projeto existe no banco para este projetoId
  console.log('[stakeholders] project encontrado:', project ? `id=${project.id}` : 'NULL — notFound() será disparado')
  console.log('[stakeholders] stakeholders vinculados:', projectStakeholders.length)
  console.log('[stakeholders] stakeholders globais do tenant:', allGlobalStakeholders.length)

  if (!project) notFound()

  const linkedStakeholderIds = new Set(projectStakeholders.map(ps => ps.stakeholderId))
  const disponiveis = allGlobalStakeholders.filter(s => !linkedStakeholderIds.has(s.id))
  const membrosProjeto = projectStakeholders.map(ps => ps.stakeholder)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ProjetoStakeholdersClient
          projetoId={projetoId}
          stakeholdersProjeto={membrosProjeto}
          stakeholdersDisponiveis={disponiveis}
          userRole={userRole}
        />
      </main>
    </div>
  )
}
