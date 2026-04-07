'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import {
  getSprintColumns,
  createSprintColumn,
  initSprintColumns,
  moveCardInSprint,
  renameSprintColumn,
  deleteSprintColumn,
  reorderSprintColumns,
} from '@/services/sprintColumnService'

export async function getSprintBoardAction(sprintId: string) {
  try {
    const { userId } = await verifySession()
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
    if (!sprint) return { error: 'Sprint não encontrado' }

    let columns = await getSprintColumns(sprintId)
    if (columns.length === 0) {
      await initSprintColumns(sprintId)
      columns = await getSprintColumns(sprintId)
    }

    const [users, tags] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, avatarUrl: true } }),
      prisma.tag.findMany({ where: { userId } }),
    ])

    return { sprint, columns, users, tags }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar sprint board' }
  }
}

export async function addSprintColumnAction(sprintId: string, title: string) {
  try {
    await verifySession()
    const existing = await getSprintColumns(sprintId)
    const position = existing.length
    const column = await createSprintColumn(sprintId, title, position)
    revalidatePath(`/sprints/${sprintId}`)
    return { column }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar coluna' }
  }
}

export async function moveCardInSprintAction(cardId: string, sprintColumnId: string, sprintPosition: number) {
  try {
    await verifySession()
    await moveCardInSprint(cardId, sprintColumnId, sprintPosition)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao mover card' }
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

    const existingCards = await prisma.card.count({
      where: { sprintColumnId: input.sprintColumnId },
    })

    const card = await prisma.card.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        color: input.color ?? '#3b82f6',
        priority: input.priority ?? 'media',
        position: existingCards,
        sprintId: input.sprintId,
        sprintColumnId: input.sprintColumnId,
        sprintPosition: existingCards,
      },
    })
    revalidatePath(`/sprints/${input.sprintId}`)
    return { card }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar card' }
  }
}

export async function renameSprintColumnAction(columnId: string, title: string) {
  try {
    await verifySession()
    const column = await renameSprintColumn(columnId, title)
    revalidatePath(`/sprints/${column.sprintId}`)
    return { column }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao renomear coluna' }
  }
}

export async function deleteSprintColumnAction(columnId: string) {
  try {
    await verifySession()
    const col = await prisma.sprintColumn.findUnique({ where: { id: columnId }, select: { sprintId: true } })
    await deleteSprintColumn(columnId)
    if (col) revalidatePath(`/sprints/${col.sprintId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir coluna' }
  }
}

export async function reorderSprintColumnsAction(columnIds: string[]) {
  try {
    await verifySession()
    await reorderSprintColumns(columnIds)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reordenar colunas' }
  }
}

export async function updateCardInSprintAction(
  cardId: string,
  data: {
    title: string
    description: string
    color: string
    priority?: string
  },
) {
  try {
    await verifySession()
    const card = await prisma.card.update({ where: { id: cardId }, data })
    revalidatePath(`/sprints/${card.sprintId}`)
    return { card }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar card' }
  }
}

export async function deleteCardInSprintAction(cardId: string) {
  try {
    await verifySession()
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { sprintId: true } })
    await prisma.card.update({ where: { id: cardId }, data: { deletedAt: new Date() } })
    if (card) revalidatePath(`/sprints/${card.sprintId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir card' }
  }
}

export async function updateSprintMetaAction(
  sprintId: string,
  data: { qualidade?: number; dificuldade?: number; description?: string; name?: string; startDate?: Date | null; endDate?: Date | null },
) {
  try {
    await verifySession()
    const sprint = await prisma.sprint.update({ where: { id: sprintId }, data })
    revalidatePath(`/sprints/${sprintId}`)
    revalidatePath('/sprints')
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar sprint' }
  }
}
