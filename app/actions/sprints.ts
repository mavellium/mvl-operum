'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { sprintsApi } from '@/lib/api-client'

export async function createSprintAction(
  _prevState: unknown,
  input: { name: string; startDate?: string; endDate?: string; projectId?: string },
) {
  try {
    const { userId } = await verifySession()
    const sprint = await sprintsApi.create({ ...input, createdBy: userId })
    revalidatePath('/sprints')
    if (input.projectId) revalidatePath(`/projetos/${input.projectId}`)
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar sprint' }
  }
}

export async function updateSprintAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const sprint = await sprintsApi.update(id, data)
    revalidatePath('/sprints')
    revalidatePath(`/sprints/${id}`)
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar sprint' }
  }
}

export async function deleteSprintAction(id: string) {
  try {
    await verifySession()
    await sprintsApi.delete(id)
    revalidatePath('/sprints')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar sprint' }
  }
}

export async function completeSprintAction(id: string) {
  try {
    await verifySession()
    const sprint = await sprintsApi.update(id, { status: 'COMPLETED' })
    revalidatePath('/sprints')
    revalidatePath(`/sprints/${id}`)
    return { sprint }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao completar sprint' }
  }
}

export async function getSprintsAction() {
  try {
    await verifySession()
    return await sprintsApi.list()
  } catch {
    return []
  }
}
