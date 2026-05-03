import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projetoId: string; versionId: string }> },
) {
  const { projetoId, versionId } = await params

  try {
    const { role, userId } = await verifySession()
    const isManager = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!isManager) {
      return NextResponse.json({ error: 'Apenas Gerentes de Projeto podem aprovar alterações' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body as { action?: string }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action deve ser "approve" ou "reject"' }, { status: 400 })
    }

    const existing = await prisma.documentVersion.findFirst({
      where: { id: versionId, projectId: projetoId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Versão não encontrada' }, { status: 404 })
    }

    const updated = await prisma.documentVersion.update({
      where: { id: versionId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedAt: action === 'approve' ? new Date() : null,
        approvedById: action === 'approve' ? userId : null,
      },
      include: { author: { select: { name: true } } },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[documento/versions PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
