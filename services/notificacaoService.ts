import prisma from '@/lib/prisma'
import { CreateNotificacaoSchema, UpdateNotificacaoSchema } from '@/lib/validation/notificacaoSchemas'
import type { CreateNotificacaoInput, UpdateNotificacaoInput } from '@/lib/validation/notificacaoSchemas'

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

  const { userId, tipo, titulo, mensagem, referencia, referenciaTipo } = parsed.data

  return prisma.notificacao.create({
    data: {
      userId,
      tipo,
      titulo,
      mensagem,
      referencia: referencia ?? undefined,
      referenciaTipo: referenciaTipo ?? undefined,
    },
  })
}

interface FindAllByUserOptions {
  status?: string
  limit?: number
}

export async function findAllByUser(userId: string, options?: FindAllByUserOptions) {
  const where: any = { userId, deletedAt: null }
  if (options?.status) {
    where.status = options.status
  }

  return prisma.notificacao.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: options?.limit ?? 50,
  })
}

export async function findById(id: string) {
  return prisma.notificacao.findUnique({
    where: { id, deletedAt: null },
  })
}

export async function markAsRead(id: string) {
  const existing = await prisma.notificacao.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notificação não encontrada')
  }

  return prisma.notificacao.update({
    where: { id },
    data: { status: 'LIDA', lido_em: new Date() },
  })
}

export async function markAsArchived(id: string) {
  const existing = await prisma.notificacao.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notificação não encontrada')
  }

  return prisma.notificacao.update({
    where: { id },
    data: { status: 'ARQUIVADA' },
  })
}

export async function deleteNotificacao(id: string) {
  const existing = await prisma.notificacao.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Notificação não encontrada')
  }

  return prisma.notificacao.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function countUnread(userId: string) {
  const notificacoes = await prisma.notificacao.findMany({
    where: { userId, status: 'NAO_LIDA', deletedAt: null },
  })
  return notificacoes.length
}
