'use server'

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { publishNotification } from '@/lib/notificationPublisher'

type MacroFase = {
  fase: string
  dataLimite: string
  custo: string
}

type DraftData = {
  form: Record<string, unknown>
  macroFases: MacroFase[]
}

export async function saveDraftAction(input: {
  projectId: string | null
  data: DraftData
}): Promise<{ draftId: string } | { error: string }> {
  try {
    const { userId, tenantId } = await verifySession()
    const { projectId, data } = input

    const existing = await prisma.projectDraft.findFirst({
      where: { tenantId, projectId: projectId ?? null, authorId: userId },
      select: { id: true },
    })

    const draft = await prisma.projectDraft.upsert({
      where: { id: existing?.id ?? 'nonexistent-placeholder' },
      create: {
        tenantId,
        projectId: projectId ?? undefined,
        authorId: userId,
        data: data as object,
      },
      update: {
        data: data as object,
      },
      select: { id: true },
    })

    if (!existing) {
      const formName = (data.form.name as string | undefined) || ''
      await publishNotification({
        userId,
        type: 'UPDATE',
        title: 'Rascunho criado automaticamente',
        message: `Suas alterações em "${formName || 'novo projeto'}" foram salvas como rascunho.`,
        reference: draft.id,
        referenceType: 'PROJECT_DRAFT',
      })
    }

    return { draftId: draft.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar rascunho' }
  }
}

export async function deleteDraftAction(input: {
  projectId: string | null
  draftId?: string
}): Promise<{ success: true } | { error: string }> {
  try {
    const { tenantId } = await verifySession()
    const { projectId, draftId } = input

    if (projectId === null && draftId) {
      await prisma.projectDraft.deleteMany({
        where: { id: draftId, tenantId },
      })
    } else {
      await prisma.projectDraft.deleteMany({
        where: { projectId, tenantId },
      })
    }

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar rascunho' }
  }
}

export async function getDraftsWithProjectsAction(): Promise<
  { drafts: Array<{ id: string; projectId: string | null; savedAt: Date; authorId: string }> }
  | { error: string }
> {
  try {
    const { tenantId, role } = await verifySession()

    if (role !== 'admin') {
      return { error: 'Acesso negado' }
    }

    const drafts = await prisma.projectDraft.findMany({
      where: { tenantId },
      select: { id: true, projectId: true, savedAt: true, authorId: true },
      orderBy: { savedAt: 'desc' },
    })

    return { drafts }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar rascunhos' }
  }
}

export async function getDraftAction(
  projectId: string | null,
): Promise<{ draft: DraftData; draftId: string } | { draft: null; draftId: null } | { error: string }> {
  try {
    const { userId, tenantId } = await verifySession()

    const record = await prisma.projectDraft.findFirst({
      where: { tenantId, projectId: projectId ?? null, authorId: userId },
      select: { id: true, data: true },
    })

    if (!record) return { draft: null, draftId: null }

    return { draft: record.data as DraftData, draftId: record.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar rascunho' }
  }
}
