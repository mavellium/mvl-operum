'use server'

import { verifySession } from '@/lib/dal'
import { createRole, findAllByTenant, updateRole, assignPermission, removePermission, getOrCreateRole, softDeleteRole } from '@/services/roleService'
import { revalidatePath } from 'next/cache'

export async function createRoleAction(
  _prevState: unknown,
  input: { name: string; scope: 'TENANT' | 'PROJETO'; description?: string },
) {
  try {
    const { tenantId } = await verifySession()
    const role = await createRole({ ...input, tenantId })
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error creating role' }
  }
}

export async function getRolesAction(scope?: 'TENANT' | 'PROJETO') {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId, { scope })
  } catch {
    return []
  }
}

export async function updateRoleAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const role = await updateRole(id, data)
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating role' }
  }
}

export async function assignPermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await assignPermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error assigning permission' }
  }
}

export async function removePermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await removePermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error removing permission' }
  }
}

export async function getOrCreateRoleAction(name: string) {
  try {
    const { tenantId } = await verifySession()
    const role = await getOrCreateRole(name, tenantId)
    revalidatePath('/projetos')
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error saving role' }
  }
}

export async function updateRoleNameAction(id: string, name: string) {
  try {
    await verifySession()
    const role = await updateRole(id, { name: name.trim() })
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating role' }
  }
}

export async function deleteRoleAction(id: string) {
  try {
    await verifySession()
    await softDeleteRole(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error deleting role' }
  }
}
