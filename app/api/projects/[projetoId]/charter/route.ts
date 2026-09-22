import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import { getTree } from '@/services/wbsService'

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

    // Fonte única: macrofases = nós top-level da árvore WBS (EAP/Planilha).
    // Fallback: tabela ProjectMacroFase (projetos legados sem árvore).
    const tree = await getTree(projetoId, tenantId)
    let macroFases: Array<{ fase: string; dataLimite?: string; custo?: string; id?: string }> = []
    if (tree.rootId && tree.nodes[tree.rootId]) {
      const topLevelIds = tree.nodes[tree.rootId].childrenIds
      macroFases = topLevelIds.map(faseId => {
        const fase = tree.nodes[faseId]
        const props = (fase?.properties as Record<string, unknown>) ?? {}
        return {
          id: fase?.id,
          fase: fase?.title ?? '',
          dataLimite: props.dataLimite ?? '',
          custo: props.custo != null ? String(props.custo) : '',
        }
      }).filter(f => f.fase)
    }
    // Fallback para projetos legados sem árvore WBS
    if (macroFases.length === 0) {
      const legacy = await prisma.projectMacroFase.findMany({
        where: { projectId: projetoId },
        orderBy: { createdAt: 'asc' },
      })
      macroFases = legacy.map(f => ({
        id: f.id,
        fase: f.fase,
        dataLimite: f.dataLimite ?? undefined,
        custo: f.custo ?? undefined,
      }))
    }

    const [gerenteEntries, userProjects] = await Promise.all([
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
