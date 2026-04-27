import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import type { ProjetoHeader, Stakeholder } from '@/components/projetos/StakeholderDocument'

function buildAddress(e: {
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}): string {
  return [
    [e.logradouro, e.numero].filter(Boolean).join(', '),
    e.bairro,
    [e.cidade, e.estado].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join('. ')
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    const canAccess = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!canAccess) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const [project, userProjects, projectStakeholders, gerenteEntries] = await Promise.all([
      prisma.project.findFirst({
        where: { id: projetoId, tenantId, deletedAt: null },
      }),
      prisma.userProject.findMany({
        where: { projectId: projetoId, active: true },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              logradouro: true,
              numero: true,
              bairro: true,
              cidade: true,
              estado: true,
              notes: true,
              deletedAt: true,
              isActive: true,
            },
          },
          department: { select: { name: true } },
        },
        orderBy: { startDate: 'asc' },
      }),
      prisma.projectStakeholder.findMany({
        where: { projectId: projetoId },
        include: { stakeholder: true },
        orderBy: { stakeholder: { name: 'asc' } },
      }),
      prisma.userProjectRole.findMany({
        where: {
          projectId: projetoId,
          deletedAt: null,
          role: { nameKey: 'gerente' },
        },
        select: { userId: true },
      }),
    ])

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const gerenteUserIds = gerenteEntries.map(e => e.userId)
    const gerenteUsers = gerenteUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: gerenteUserIds } },
          select: { name: true },
        })
      : []
    const gerenteProjeto = gerenteUsers.map(u => u.name).join(' e ')

    const dept = project.departamentos?.[0] ?? ''
    const semestreLabel =
      project.semestre === '1' ? '1º Semestre' :
      project.semestre === '2' ? '2º Semestre' :
      (project.semestre ?? '')
    const semestreAno = [semestreLabel, project.ano].filter(Boolean).join(' ')
    const categoria = [project.location ?? 'Stakeholder externo', dept, semestreAno].filter(Boolean).join(' - ')

    const header: ProjetoHeader = {
      categoria,
      nomeProjeto: project.name,
      gerenteProjeto,
      elaboradoPor: '',
      aprovadoPor: '',
      versao: '1.0',
      dataCriacao: project.startDate ? formatDate(project.startDate) : '',
      dataAprovacao: project.startDate ? formatDate(project.startDate) : '',
      logoUrl: project.logoUrl,
    }

    const membros: Stakeholder[] = userProjects
      .filter(up => up.user.deletedAt === null && up.user.isActive)
      .map((up, i) => ({
        ref: String(i + 1).padStart(2, '0'),
        nome: up.user.name,
        empresaEquipe: up.department?.name ?? project.name,
        cargoCompetencia: up.role ?? '',
        email: up.user.email ?? '',
        telefoneFax: up.user.phone ?? '',
        endereco: buildAddress(up.user),
        observacoes: up.user.notes ?? '',
      }))

    const externos: Stakeholder[] = projectStakeholders.map((ps, i) => ({
      ref: String(membros.length + i + 1).padStart(2, '0'),
      nome: ps.stakeholder.name,
      empresaEquipe: ps.stakeholder.company ?? '',
      cargoCompetencia: ps.stakeholder.competence ?? '',
      email: ps.stakeholder.email ?? '',
      telefoneFax: ps.stakeholder.phone ?? '',
      endereco: buildAddress(ps.stakeholder),
      observacoes: ps.stakeholder.notes ?? '',
    }))

    return NextResponse.json({ header, stakeholders: [...membros, ...externos] })
  } catch (err) {
    console.error('[documento/route]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
