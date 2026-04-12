'use server'

import { verifySession } from '@/lib/dal'
import {
  createDepartment,
  findAllByTenant,
  updateDepartment,
  deactivate,
  getOrCreateDepartment,
  softDeleteDepartment,
} from '@/services/departmentService'
import { revalidatePath } from 'next/cache'

export async function createDepartmentAction(
  _prevState: unknown,
  input: { name: string; description?: string; hourlyRate?: number },
) {
  try {
    const { tenantId } = await verifySession()
    const department = await createDepartment({ ...input, tenantId })
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error creating department' }
  }
}

export async function getDepartmentsAction() {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId)
  } catch {
    return []
  }
}

export async function updateDepartmentAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const department = await updateDepartment(id, data)
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating department' }
  }
}

export async function deactivateDepartmentAction(id: string) {
  try {
    await verifySession()
    await deactivate(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error deactivating department' }
  }
}

export async function getOrCreateDepartmentAction(name: string) {
  try {
    const { tenantId } = await verifySession()
    const department = await getOrCreateDepartment(name, tenantId)
    revalidatePath('/projetos')
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error saving department' }
  }
}

export async function updateDepartmentNameAction(id: string, name: string) {
  try {
    await verifySession()
    const department = await updateDepartment(id, { name: name.trim() })
    return { department }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating department' }
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    await verifySession()
    await softDeleteDepartment(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error deleting department' }
  }
}
