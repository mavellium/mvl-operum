'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export async function getUsersAction() {
  await verifySession()
  return prisma.user.findMany({ select: { id: true, name: true, email: true } })
}

export async function getCurrentUserAction() {
  const { userId } = await verifySession()
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
}
