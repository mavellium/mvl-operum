'use server'

import { verifySession } from '@/lib/dal'
import { createSprint, updateSprint, deleteSprint, assignCardToSprint, completeSprint, getSprintsForBoard } from '@/services/sprintService'

export async function createSprintAction(
  _prevState: unknown,
  input: { name: string; boardId: string; startDate?: string; endDate?: string },
) {
  try {
    const { userId } = await verifySession()
    const sprint = await createSprint({ ...input, createdBy: userId } as Parameters<typeof createSprint>[0])
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar sprint' }
  }
}

export async function updateSprintAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const sprint = await updateSprint(id, data)
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar sprint' }
  }
}

export async function deleteSprintAction(id: string) {
  try {
    await verifySession()
    await deleteSprint(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar sprint' }
  }
}

export async function assignCardToSprintAction(cardId: string, sprintId: string | null) {
  try {
    await verifySession()
    await assignCardToSprint(cardId, sprintId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao associar card ao sprint' }
  }
}

export async function completeSprintAction(id: string) {
  try {
    await verifySession()
    const sprint = await completeSprint(id)
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao completar sprint' }
  }
}

export async function getSprintsForBoardAction(boardId: string) {
  await verifySession()
  return getSprintsForBoard(boardId)
}
