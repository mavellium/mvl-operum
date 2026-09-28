import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import {
  getOrCreateDocument,
  saveDocument,
  resetDocument,
  formatInstitucionalInfo,
  EapValidationError,
  EapNotFoundError,
} from '@/services/eapService'
import { SaveEapDocumentSchema, validateEapDepth } from '@/lib/validation/eapSchemas'
import type { EapNode } from '@/types/eap'

type RouteCtx = { params: Promise<{ projetoId: string }> }

/** Garante que o usuário é membro ativo (ou admin/gerente) do projeto. */
async function requireProjectAccess(userId: string, role: string, tenantId: string, projetoId: string): Promise<void> {
  if (role === 'admin') return
  const manager = await isProjectManager(userId, projetoId)
  if (manager) return
  const member = await prisma.project.findFirst({
    where: { id: projetoId, tenantId, deletedAt: null, members: { some: { userId, active: true } } },
    select: { id: true },
  })
  if (!member) throw new EapNotFoundError('Não autorizado')
}

async function loadProject(tenantId: string, projetoId: string) {
  return prisma.project.findFirst({
    where: { id: projetoId, tenantId, deletedAt: null },
    select: { id: true, name: true, departamentos: true, semestre: true, ano: true },
  })
}

/**
 * Converte falhas conhecidas em respostas úteis. Antes, qualquer erro fora de
 * EapNotFoundError virava 500 "Erro interno" e a causa só aparecia no log.
 */
function errorResponse(err: unknown, where: string, projetoId: string) {
  if (err instanceof EapNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  if (err instanceof EapValidationError) {
    return NextResponse.json({ error: err.message }, { status: 422 })
  }
  const code = (err as { code?: unknown } | null)?.code
  console.error(`[eap ${where}]`, { projetoId, code }, err)
  // P2021/P2022: tabela ou coluna inexistente — migration do app não aplicada.
  if (code === 'P2021' || code === 'P2022') {
    return NextResponse.json(
      { error: 'Documento EAP indisponível: o banco de dados está desatualizado. Avise o administrador.' },
      { status: 503 },
    )
  }
  return NextResponse.json({ error: 'Erro interno ao carregar a EAP' }, { status: 500 })
}

/** GET — retorna o documento EAP do projeto (cria a partir do modelo no 1º acesso). */
export async function GET(_: Request, { params }: RouteCtx) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    await requireProjectAccess(userId, role, tenantId, projetoId)

    const project = await loadProject(tenantId, projetoId)
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const document = await getOrCreateDocument(projetoId, tenantId, project.name)
    return NextResponse.json({
      document,
      instituicao: formatInstitucionalInfo(project),
    })
  } catch (err) {
    return errorResponse(err, 'GET', projetoId)
  }
}

/** PUT — salva metadados + árvore (códigos/ordem recalculados pelo servidor). */
export async function PUT(request: Request, { params }: RouteCtx) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    await requireProjectAccess(userId, role, tenantId, projetoId)

    const project = await loadProject(tenantId, projetoId)
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const parsed = SaveEapDocumentSchema.safeParse(body ?? {})
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const nodes = parsed.data.nodes as unknown as EapNode[]
    if (!validateEapDepth(nodes)) {
      return NextResponse.json(
        { error: 'Profundidade máxima de 20 níveis excedida.' },
        { status: 400 },
      )
    }

    const document = await saveDocument(projetoId, tenantId, {
      projectName: parsed.data.projectName,
      projectManager: parsed.data.projectManager,
      preparedBy: parsed.data.preparedBy,
      version: parsed.data.version,
      approvedBy: parsed.data.approvedBy,
      signature: parsed.data.signature,
      approvalDate: parsed.data.approvalDate ?? null,
      nodes,
    })

    return NextResponse.json({ document })
  } catch (err) {
    return errorResponse(err, 'PUT', projetoId)
  }
}

/** POST — "Criar a partir do modelo EAP": recria o documento do template. */
export async function POST(_: Request, { params }: RouteCtx) {
  const { projetoId } = await params

  try {
    const { tenantId, role, userId } = await verifySession()
    await requireProjectAccess(userId, role, tenantId, projetoId)

    const project = await loadProject(tenantId, projetoId)
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const document = await resetDocument(projetoId, tenantId, project.name)
    return NextResponse.json({ document })
  } catch (err) {
    return errorResponse(err, 'POST', projetoId)
  }
}