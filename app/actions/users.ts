'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export async function getUsersAction() {
  const { tenantId } = await verifySession()
  return prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
}

export async function getCurrentUserAction() {
  const { userId } = await verifySession()
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
}
