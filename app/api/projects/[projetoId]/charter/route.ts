import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    const isManager = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!isManager) {
      const member = await prisma.project.findFirst({
        where: { id: projetoId, tenantId, deletedAt: null, members: { some: { userId, active: true } } },
        select: { id: true },
      })
      if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projetoId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        startDate: true,
        justificativa: true,
        objetivos: true,
        metodologia: true,
        descricaoProduto: true,
        premissas: true,
        restricoes: true,
        limitesAutoridade: true,
      },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const [macroFases, gerenteEntries, userProjects] = await Promise.all([
      prisma.projectMacroFase.findMany({
        where: { projectId: projetoId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.userProjectRole.findMany({
        where: { projectId: projetoId, deletedAt: null, role: { nameKey: 'gerente' } },
        select: { userId: true },
      }),
      prisma.userProject.findMany({
        where: { projectId: projetoId, active: true },
        include: { user: { select: { name: true, signatureUrl: true } } },
        orderBy: { order: 'asc' },
      }),
    ])

    const gerenteIds = gerenteEntries.map(e => e.userId)
    const gerenteUsers = gerenteIds.length
      ? await prisma.user.findMany({
          where: { id: { in: gerenteIds } },
          select: { name: true, signatureUrl: true },
        })
      : []

    const membros = userProjects
      .filter(up => up.user !== null)
      .map(up => ({ name: up.user.name }))

    return NextResponse.json({
      project,
      macroFases,
      gerente: gerenteUsers[0] ?? null,
      gerenteProjeto: gerenteUsers.map(u => u.name).join(' e '),
      membros,
    })
  } catch (err) {
    console.error('[charter GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    const isManager = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!isManager) {
      const member = await prisma.project.findFirst({
        where: { id: projetoId, tenantId, deletedAt: null, members: { some: { userId, active: true } } },
        select: { id: true },
      })
      if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projetoId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const body = await request.json()
    const allowed = ['justificativa', 'objetivos', 'metodologia', 'descricaoProduto', 'premissas', 'restricoes', 'limitesAutoridade'] as const
    const data: Partial<Record<typeof allowed[number], string>> = {}
    for (const key of allowed) {
      if (key in body && typeof body[key] === 'string') {
        data[key] = body[key]
      }
    }

    const updated = await prisma.project.update({ where: { id: projetoId }, data })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[charter PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
