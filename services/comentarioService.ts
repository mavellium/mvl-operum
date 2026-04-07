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

  const { cardId, userId, texto, tipo, reacoes } = parsed.data

  return prisma.comentario.create({
    data: {
      cardId,
      userId,
      texto,
      tipo: tipo ?? 'COMENTARIO',
      reacoes: reacoes ?? undefined,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function findAllByCard(cardId: string) {
  return prisma.comentario.findMany({
    where: { cardId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function findById(id: string) {
  return prisma.comentario.findUnique({
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

  const existing = await prisma.comentario.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comentário não encontrado')
  }

  return prisma.comentario.update({
    where: { id },
    data: parsed.data,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
}

export async function deleteComentario(id: string) {
  const existing = await prisma.comentario.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comentário não encontrado')
  }

  return prisma.comentario.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function addReacao(id: string, reacao: string) {
  const existing = await prisma.comentario.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Comentário não encontrado')
  }

  const reacoes = (existing.reacoes as Record<string, number>) || {}
  reacoes[reacao] = (reacoes[reacao] || 0) + 1

  return prisma.comentario.update({
    where: { id },
    data: { reacoes },
  })
}
