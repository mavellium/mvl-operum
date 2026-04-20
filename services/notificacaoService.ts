import prisma from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma'
import { CreateNotificacaoSchema } from '@/lib/validation/notificacaoSchemas'
import type { CreateNotificacaoInput } from '@/lib/validation/notificacaoSchemas'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function create(input: CreateNotificacaoInput) {
  const parsed = CreateNotificacaoSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { userId, type, title, message, reference, referenceType } = parsed.data

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      reference: reference ?? undefined,
      referenceType: referenceType ?? undefined,
    },
  })
}

interface FindAllByUserOptions {
  status?: string
  limit?: number
}

export async function findAllByUser(userId: string, options?: FindAllByUserOptions) {
  const where: Prisma.NotificationWhereInput = { userId, deletedAt: null }
  if (options?.status) {
    where.status = options.status as Prisma.NotificationWhereInput['status']
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
  })
}

export async function findById(id: string) {
  return prisma.notification.findUnique({
    where: { id, deletedAt: null },
  })
}

export async function markAsRead(id: string) {
  const existing = await prisma.notification.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notification not found')
  }

  return prisma.notification.update({
    where: { id },
    data: { status: 'READ', readAt: new Date() },
  })
}

export async function markAsArchived(id: string) {
  const existing = await prisma.notification.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notification not found')
  }

  return prisma.notification.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  })
}

export async function deleteNotificacao(id: string) {
  const existing = await prisma.notification.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notification not found')
  }

  return prisma.notification.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function countUnread(userId: string) {
  return prisma.notification.count({
    where: { userId, status: 'UNREAD', deletedAt: null },
  })
}
