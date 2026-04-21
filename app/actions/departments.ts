'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { departmentsApi } from '@/lib/api-client'

export async function createDepartmentAction(
  _prevState: unknown,
  input: { name: string; description?: string; hourlyRate?: number },
) {
  try {
    await verifySession()
    const department = await departmentsApi.create(input as Record<string, unknown>)
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar departamento' }
  }
}

export async function getDepartmentsAction() {
  try {
    await verifySession()
    return await departmentsApi.list()
  } catch {
    return []
  }
}

export async function updateDepartmentAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const department = await departmentsApi.update(id, data)
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar departamento' }
  }
}

export async function deactivateDepartmentAction(id: string) {
  try {
    await verifySession()
    await departmentsApi.update(id, { active: false })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao desativar departamento' }
  }
}

export async function getOrCreateDepartmentAction(name: string) {
  try {
    await verifySession()
    const list = await departmentsApi.list() as Array<{ id: string; name: string }>
    const existing = list.find(d => d.name.toLowerCase() === name.toLowerCase())
    if (existing) return { department: existing }
    const department = await departmentsApi.create({ name })
    revalidatePath('/projetos')
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar departamento' }
  }
}

export async function updateDepartmentNameAction(id: string, name: string) {
  try {
    await verifySession()
    const department = await departmentsApi.update(id, { name: name.trim() })
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar departamento' }
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    await verifySession()
    await departmentsApi.delete(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover departamento' }
  }
}
