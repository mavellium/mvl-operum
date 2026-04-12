import prisma from '@/lib/prisma'
import { CreateComentarioSchema, UpdateComentarioSchema } from '@/lib/validation/comentarioSchemas'
import type { CreateComentarioInput, UpdateComentarioInput } from '@/lib/validation/comentarioSchemas'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function create(input: CreateComentarioInput) {
  const parsed = CreateComentarioSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { cardId, userId, content, type, reactions } = parsed.data

  return prisma.comment.create({
    data: {
      cardId,
      userId,
      content,
      type: type ?? 'COMMENT',
      reactions: reactions ?? undefined,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function findAllByCard(cardId: string) {
  return prisma.comment.findMany({
    where: { cardId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function findById(id: string) {
  return prisma.comment.findUnique({
    where: { id, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function update(id: string, input: UpdateComentarioInput) {
  const parsed = UpdateComentarioSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.comment.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comment not found')
  }

  return prisma.comment.update({
    where: { id },
    data: parsed.data,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function deleteComentario(id: string) {
  const existing = await prisma.comment.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comment not found')
  }

  return prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function addReacao(id: string, reacao: string) {
  const existing = await prisma.comment.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comment not found')
  }

  const reactions = (existing.reactions as Record<string, number>) || {}
  reactions[reacao] = (reactions[reacao] || 0) + 1

  return prisma.comment.update({
    where: { id },
    data: { reactions },
  })
}
