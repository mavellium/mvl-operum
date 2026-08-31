import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { getTree } from '@/services/wbsService'
import { computePlanilha } from '@/lib/custosCalc'
import { gerarPlanilhaXlsx } from '@/lib/exports/planilhaCustosXlsx'

export const dynamic = 'force-dynamic'

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
    const valorPorMinuto = Math.round(valorReferencia / (horasPorDia * 22 * 60) * 10000) / 10000

    const tree = await getTree(projetoId, tenantId)
    const planilha = computePlanilha(tree.nodes, tree.rootId, { valorPorMinuto, horasPorDia })

    const buffer = await gerarPlanilhaXlsx(planilha, {
      nomeProjeto: project.name,
      valorPorMinuto,
      horasPorDia,
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="planilha-custos-${project.name.replace(/\s+/g, '-').toLowerCase()}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('[planilha-custos export GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
