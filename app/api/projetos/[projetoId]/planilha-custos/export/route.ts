import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { getTree } from '@/services/wbsService'
import { computarPlanilhaCustos, type Elaborador } from '@/lib/planilhaCustos'
import { gerarPlanilhaXlsx } from '@/lib/exports/planilhaCustosXlsx'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function nomeArquivo(nomeProjeto: string): string {
  const nome = nomeProjeto.trim().replace(/[^\wÀ-ÿ-]+/g, '_').replace(/_+/g, '_')
  return `Planilha_de_Custos_${nome}.xlsx`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId } = await verifySession()
    const project = await findById(projetoId)
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const valorReferencia = project.valorReferencia ?? 4000
    const horasPorDia = project.horasPorDia ?? 8

    const userProjects = await prisma.userProject.findMany({
      where: { projectId: projetoId, active: true },
      include: { user: { select: { id: true, name: true, deletedAt: true, isActive: true } } },
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

    const tree = await getTree(projetoId, tenantId)
    const planilha = computarPlanilhaCustos(tree.nodes, tree.rootId, { valorReferencia, horasPorDia }, elaboradoresPorId)

    const buffer = await gerarPlanilhaXlsx(planilha, {
      nomeProjeto: project.name,
      inicioProjeto: project.startDate,
      fimProjeto: project.endDate,
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeArquivo(project.name)}"`,
      },
    })
  } catch (err) {
    console.error('[planilha-custos export GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
