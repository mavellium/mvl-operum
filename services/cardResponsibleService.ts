import prisma from '@/lib/prisma'

export async function addResponsible(cardId: string, userId: string) {
  return prisma.cardResponsible.create({
    data: { cardId, userId },
  })
}

export async function removeResponsible(cardId: string, userId: string) {
  return prisma.cardResponsible.delete({
    where: { cardId_userId: { cardId, userId } },
  })
}

export async function getResponsibles(cardId: string) {
  return prisma.cardResponsible.findMany({
    where: { cardId },
    include: {
      user: {
        select: { id: true, name: true, cargo: true, avatarUrl: true },
      },
    },
  })
}
