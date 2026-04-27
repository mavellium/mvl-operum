'use server'

import { verifySession } from '@/lib/dal'
import { adminApi } from '@/lib/api-client'

export async function getUsersAction() {
  await verifySession()
  return adminApi.listAllUsers()
}

export async function getCurrentUserAction() {
  const { authApi } = await import('@/lib/api-client')
  await verifySession()
  return authApi.me()
}
