import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'

async function canAccess(userId: string, projetoId: string, tenantId: string, role: string) {
  if (role === 'admin') return true
  if (await isProjectManager(userId, projetoId)) return true
  const member = await prisma.project.findFirst({
    where: { id: projetoId, tenantId, deletedAt: null, members: { some: { userId, active: true } } },
    select: { id: true },
  })
  return member !== null
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    if (!(await canAccess(userId, projetoId, tenantId, role))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const fases = await prisma.projectMacroFase.findMany({
      where: { projectId: projetoId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(fases)
  } catch (err) {
    console.error('[macro-fases GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    if (!(await canAccess(userId, projetoId, tenantId, role))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projetoId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const body = await request.json()
    const fase = await prisma.projectMacroFase.create({
      data: {
        projectId: projetoId,
        fase: String(body.fase ?? ''),
        dataLimite: body.dataLimite ? String(body.dataLimite) : null,
        custo: body.custo ? String(body.custo) : null,
      },
    })
    return NextResponse.json(fase, { status: 201 })
  } catch (err) {
    console.error('[macro-fases POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
