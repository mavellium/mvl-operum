import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projetoId: string }> },
) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    const canAccess = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!canAccess) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projetoId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''

    const versions = await prisma.documentVersion.findMany({
      where: {
        projectId: projetoId,
        ...(search
          ? {
              OR: [
                { commitTitle: { contains: search, mode: 'insensitive' } },
                { author: { is: { name: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const res = NextResponse.json(versions)
    res.headers.set('x-is-manager', String(canAccess))
    return res
  } catch (err) {
    console.error('[documento/versions GET]', err)
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
    const isManager = role === 'admin' || (await isProjectManager(userId, projetoId))
    if (!isManager && !(await canMemberCreate(userId, projetoId, tenantId))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projetoId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { commitTitle, versao, elaboradoPor, aprovadoPor, dataAprovacao } = body

    if (!commitTitle || !versao || !elaboradoPor || !aprovadoPor || !dataAprovacao) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: commitTitle, versao, elaboradoPor, aprovadoPor, dataAprovacao' },
        { status: 400 },
      )
    }

    const now = new Date()
    const version = await prisma.documentVersion.create({
      data: {
        projectId: projetoId,
        commitTitle,
        versao,
        elaboradoPor,
        aprovadoPor,
        dataAprovacao,
        authorId: userId,
        status: isManager ? 'APPROVED' : 'PENDING',
        approvedAt: isManager ? now : null,
        approvedById: isManager ? userId : null,
      },
      include: { author: { select: { name: true } } },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (err) {
    console.error('[documento/versions POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Membros do projeto podem criar commits (apenas gerentes auto-aprovam)
async function canMemberCreate(userId: string, projectId: string, tenantId: string): Promise<boolean> {
  const member = await prisma.project.findFirst({
    where: {
      id: projectId,
      tenantId,
      deletedAt: null,
      members: { some: { userId, active: true } },
    },
    select: { id: true },
  })
  return member !== null
}
