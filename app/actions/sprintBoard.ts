'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { sprintsApi, cardsApi, tagsApi, adminApi } from '@/lib/api-client'

type BacklogCard = { id: string; title: string; description: string; color: string; priority?: string | null; tags?: unknown[]; attachments?: unknown[]; responsibles?: unknown[] }

type SprintBoardData = {
  sprint: { id: string; name: string; status: string; projectId?: string | null; startDate: Date | string | null; endDate: Date | string | null; description?: string | null; qualidade?: number | null; dificuldade?: number | null }
  columns: { id: string; title: string; position: number; cards: { id: string; title: string; description: string; color: string; priority?: string | null; sprintPosition?: number | null; tags?: { tagId: string; tag: { id?: string; name: string; color: string } }[]; attachments?: { id: string; fileName: string; fileType: string; filePath: string; fileSize: number; isCover?: boolean; uploadedAt: string | Date }[]; timeEntries?: { duration: number }[]; responsibles?: { user: { id: string; name: string; avatarUrl: string | null } }[] }[] }[]
  users: { id: string; name: string; email: string; avatarUrl?: string | null }[]
  tags: { id: string; name: string; color: string }[]
}

export async function getSprintBoardAction(sprintId: string): Promise<SprintBoardData | { error: string }> {
  try {
    await verifySession()
    const [sprint, columns, users, tags] = await Promise.all([
      sprintsApi.get(sprintId),
      sprintsApi.listColumns(sprintId),
      adminApi.listAllUsers(),
      tagsApi.list(),
    ])
    return { sprint, columns, users, tags } as unknown as SprintBoardData
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar sprint board' }
  }
}

export async function addSprintColumnAction(sprintId: string, title: string) {
  try {
    await verifySession()
    const existing = await sprintsApi.listColumns(sprintId) as unknown[]
    const column = await sprintsApi.createColumn(sprintId, { title, position: existing.length })
    revalidatePath(`/sprints/${sprintId}`)
    return { column }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar coluna' }
  }
}

export async function moveCardInSprintAction(
  cardId: string,
  sprintColumnId: string,
  sprintPosition: number,
  reason?: string,
) {
  try {
    await verifySession()
    await cardsApi.update(cardId, { sprintColumnId, sprintPosition, ...(reason ? { reason } : {}) })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao mover card' }
  }
}

export async function getCardMovementsAction(cardId: string) {
  try {
    await verifySession()
    const movements = await cardsApi.listMovements(cardId)
    return { movements }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar movimentações' }
  }
}

export async function createCardInSprintAction(input: {
  sprintId: string
  sprintColumnId: string
  title: string
  description?: string
  color?: string
  priority?: string
}) {
  try {
    await verifySession()
    const card = await cardsApi.create({
      title: input.title,
      description: input.description ?? '',
      color: input.color ?? '#3b82f6',
      priority: input.priority ?? 'media',
      sprintId: input.sprintId,
      sprintColumnId: input.sprintColumnId,
    })
    revalidatePath(`/sprints/${input.sprintId}`)
    return { card }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar card' }
  }
}

export async function renameSprintColumnAction(sprintId: string, columnId: string, title: string) {
  try {
    await verifySession()
    const column = await sprintsApi.updateColumn(sprintId, columnId, { title })
    revalidatePath(`/sprints/${sprintId}`)
    return { column }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao renomear coluna' }
  }
}

export async function deleteSprintColumnAction(sprintId: string, columnId: string) {
  try {
    await verifySession()
    await sprintsApi.deleteColumn(sprintId, columnId)
    revalidatePath(`/sprints/${sprintId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir coluna' }
  }
}

export async function reorderSprintColumnsAction(sprintId: string, columnIds: string[]) {
  try {
    await verifySession()
    await sprintsApi.reorderColumns(sprintId, columnIds)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reordenar colunas' }
  }
}

export async function updateCardInSprintAction(
  sprintId: string,
  cardId: string,
  data: { title: string; description: string; color: string; priority?: string },
) {
  try {
    await verifySession()
    const card = await cardsApi.update(cardId, data as Record<string, unknown>)
    revalidatePath(`/sprints/${sprintId}`)
    return { card }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar card' }
  }
}

export async function deleteCardInSprintAction(sprintId: string, cardId: string) {
  try {
    await verifySession()
    await cardsApi.delete(cardId)
    revalidatePath(`/sprints/${sprintId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir card' }
  }
}

export async function getProjectBacklogAction(projectId: string): Promise<BacklogCard[] | { error: string }> {
  try {
    await verifySession()
    const cards = await cardsApi.listBacklog(projectId)
    return cards
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar backlog' }
  }
}

export async function moveCardToSprintAction(
  cardId: string,
  sprintId: string,
  columnId: string,
  position: number,
) {
  try {
    await verifySession()
    await cardsApi.update(cardId, { sprintId, sprintColumnId: columnId, sprintPosition: position })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao mover card para sprint' }
  }
}

export async function moveCardToBacklogAction(cardId: string) {
  try {
    await verifySession()
    await cardsApi.update(cardId, { sprintId: null, sprintColumnId: null, sprintPosition: null })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao mover card para backlog' }
  }
}

export async function createBacklogCardAction(projectId: string, title: string) {
  try {
    await verifySession()
    const card = await cardsApi.create({ projectId, title, description: '' })
    return { card }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar card no backlog' }
  }
}

export async function updateSprintMetaAction(
  sprintId: string,
  data: { qualidade?: number; dificuldade?: number; description?: string; name?: string; startDate?: Date | null; endDate?: Date | null },
) {
  try {
    await verifySession()
    const sprint = await sprintsApi.update(sprintId, data as Record<string, unknown>)
    revalidatePath(`/sprints/${sprintId}`)
    revalidatePath('/sprints')
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar sprint' }
  }
}
