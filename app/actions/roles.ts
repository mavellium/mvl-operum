'use server'

import { verifySession } from '@/lib/dal'
import { createRole, findAllByTenant, updateRole, assignPermission, removePermission } from '@/services/roleService'

export async function createRoleAction(
  _prevState: unknown,
  input: { nome: string; escopo: 'TENANT' | 'PROJETO'; descricao?: string },
) {
  try {
    const { tenantId } = await verifySession()
    const role = await createRole({ ...input, tenantId })
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar função' }
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
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar função' }
  }
}

export async function assignPermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await assignPermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atribuir permissão' }
  }
}

export async function removePermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await removePermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover permissão' }
  }
}
