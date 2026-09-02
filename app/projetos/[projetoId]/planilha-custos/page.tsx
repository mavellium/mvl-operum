import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import { getTree } from '@/services/wbsService'
import { computarPlanilhaCustos, fmtDataBR, type Elaborador } from '@/lib/planilhaCustos'
import prisma from '@/lib/prisma'
import PlanilhaCustosView from '@/components/custos/PlanilhaCustosView'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Planilha de Custos' }

export default async function PlanilhaCustosPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { role, userId, tenantId } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  const canEdit = role === 'admin' || await isProjectManager(userId, projetoId)

  const valorReferencia = project.valorReferencia ?? 4000
  const horasPorDia = project.horasPorDia ?? 8

  // Membros internos do projeto (elaboradores) — trazem salário e jornada.
  const userProjects = await prisma.userProject.findMany({
    where: { projectId: projetoId, active: true },
    include: {
      user: { select: { id: true, name: true, email: true, deletedAt: true, isActive: true } },
      department: { select: { name: true } },
    },
    orderBy: { order: 'asc' },
  })

  const elaboradores: Elaborador[] = userProjects
    .filter(up => up.user.deletedAt === null && up.user.isActive)
    .map(up => ({
      userId: up.userId,
      name: up.user.name,
      remuneracao: up.remuneracao ?? null,
      horasDiarias: up.horasDiarias ?? null,
    }))

  const elaboradoresPorId = new Map(elaboradores.map(e => [e.userId, e]))

  // Usuários do tenant (para adicionar elaborador inline — membros do projeto).
  const allUsers = await prisma.user.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  const usuariosDisponiveis = allUsers.map(u => ({ id: u.id, name: u.name, email: u.email }))

  const tree = await getTree(projetoId, tenantId)
  const planilha = computarPlanilhaCustos(tree.nodes, tree.rootId, { valorReferencia, horasPorDia }, elaboradoresPorId)

  return (
    <PlanilhaCustosView
      projetoId={projetoId}
      nomeProjeto={project.name}
      inicioProjeto={project.startDate ? fmtDataBR(project.startDate.toISOString()) : '—'}
      fimProjeto={project.endDate ? fmtDataBR(project.endDate.toISOString()) : '—'}
      canEdit={canEdit}
      planilha={planilha}
      elaboradores={elaboradores}
      usuariosDisponiveis={usuariosDisponiveis}
      exportUrl={`/api/projetos/${projetoId}/planilha-custos/export`}
    />
  )
}