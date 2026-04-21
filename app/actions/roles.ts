'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { rolesApi } from '@/lib/api-client'

export async function createRoleAction(
  _prevState: unknown,
  input: { name: string; scope: 'TENANT' | 'PROJETO'; description?: string },
) {
  try {
    await verifySession()
    const role = await rolesApi.create(input as Record<string, unknown>)
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar role' }
  }
}

export async function getRolesAction(scope?: 'TENANT' | 'PROJETO') {
  try {
    await verifySession()
    const roles = await rolesApi.list() as Array<Record<string, unknown>>
    if (scope) return roles.filter(r => r.scope === scope)
    return roles
  } catch {
    return []
  }
}

export async function updateRoleAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const role = await rolesApi.update(id, data)
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar role' }
  }
}

export async function assignPermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await rolesApi.assignPermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atribuir permissão' }
  }
}

export async function removePermissionAction(roleId: string, permissionId: string) {
  try {
    await verifySession()
    await rolesApi.removePermission(roleId, permissionId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover permissão' }
  }
}

export async function getOrCreateRoleAction(name: string) {
  try {
    await verifySession()
    const roles = await rolesApi.list() as Array<{ id: string; name: string }>
    const existing = roles.find(r => r.name.toLowerCase() === name.toLowerCase())
    if (existing) return { role: existing }
    const role = await rolesApi.create({ name, scope: 'PROJETO', nameKey: name.toLowerCase().replace(/\s+/g, '_') })
    revalidatePath('/projetos')
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar role' }
  }
}

export async function updateRoleNameAction(id: string, name: string) {
  try {
    await verifySession()
    const role = await rolesApi.update(id, { name: name.trim() })
    return { role }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar role' }
  }
}

export async function deleteRoleAction(id: string) {
  try {
    await verifySession()
    await rolesApi.delete(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover role' }
  }
}
