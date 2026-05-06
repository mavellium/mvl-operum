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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projetoId: string; faseId: string }> },
) {
  const { projetoId, faseId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    if (!(await canAccess(userId, projetoId, tenantId, role))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const fase = await prisma.projectMacroFase.findFirst({
      where: { id: faseId, projectId: projetoId },
    })
    if (!fase) return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })

    const body = await request.json()
    const updated = await prisma.projectMacroFase.update({
      where: { id: faseId },
      data: {
        ...(typeof body.fase === 'string' && { fase: body.fase }),
        ...(typeof body.dataLimite === 'string' && { dataLimite: body.dataLimite }),
        ...(typeof body.custo === 'string' && { custo: body.custo }),
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[macro-fases PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ projetoId: string; faseId: string }> },
) {
  const { projetoId, faseId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    if (!(await canAccess(userId, projetoId, tenantId, role))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const fase = await prisma.projectMacroFase.findFirst({
      where: { id: faseId, projectId: projetoId },
    })
    if (!fase) return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })

    await prisma.projectMacroFase.delete({ where: { id: faseId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[macro-fases DELETE]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
