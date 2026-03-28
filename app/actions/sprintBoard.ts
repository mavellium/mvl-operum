'use server'

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import {
  getSprintColumns,
  createSprintColumn,
  initSprintColumns,
  moveCardInSprint,
} from '@/services/sprintColumnService'

export async function getSprintBoardAction(sprintId: string) {
  try {
    await verifySession()
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
    if (!sprint) return { error: 'Sprint não encontrado' }

    let columns = await getSprintColumns(sprintId)
    if (columns.length === 0) {
      await initSprintColumns(sprintId)
      columns = await getSprintColumns(sprintId)
    }

    const [users, tags] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, avatarUrl: true } }),
      prisma.tag.findMany({ where: { boardId: sprint.boardId } }),
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

export async function updateSprintMetaAction(
  sprintId: string,
  data: { qualidade?: number; dificuldade?: number; description?: string },
) {
  try {
    await verifySession()
    const sprint = await prisma.sprint.update({ where: { id: sprintId }, data })
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar sprint' }
  }
}
