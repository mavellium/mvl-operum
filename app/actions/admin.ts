'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import {
  listAllUsers,
  adminCreateUser,
  adminUpdateUser,
  toggleUserActive,
  setUserRole,
} from '@/services/adminService'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') {
    throw new Error('Acesso restrito a administradores')
  }
  return session
}

export async function listUsersAction() {
  try {
    await requireAdmin()
    const users = await listAllUsers()
    return { users }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao listar usuários' }
  }
}

export async function adminCreateUserAction(data: {
  name: string
  email: string
  password: string
  isAdmin?: boolean
  forcePasswordChange?: boolean
}) {
  try {
    const { tenantId } = await requireAdmin()
    const user = await adminCreateUser({ ...data, tenantId })
    revalidatePath('/admin/users')
    return { user }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar usuário' }
  }
}

export async function adminUpdateUserAction(
  userId: string,
  data: {
    name?: string
    email?: string
    password?: string
    cargo?: string
    departamento?: string
    valorHora?: number
  },
) {
  try {
    await requireAdmin()
    const user = await adminUpdateUser(userId, data)
    revalidatePath('/admin/users')
    return { user }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar usuário' }
  }
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  try {
    await requireAdmin()
    const user = await toggleUserActive(userId, active)
    revalidatePath('/admin/users')
    return { user }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao alterar status do usuário' }
  }
}

export async function setUserRoleAction(userId: string, role: string) {
  try {
    await requireAdmin()
    const user = await setUserRole(userId, role)
    revalidatePath('/admin/users')
    return { user }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao alterar role do usuário' }
  }
}
