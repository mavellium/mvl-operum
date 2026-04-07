import prisma from '@/lib/prisma'

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function validateRatings(qualidade: number, dificuldade: number) {
  if (qualidade < 1 || qualidade > 5) throw new ValidationError('Qualidade deve ser entre 1 e 5')
  if (dificuldade < 1 || dificuldade > 5) throw new ValidationError('Dificuldade deve ser entre 1 e 5')
}

export async function criarFeedback(params: {
  sprintId: string
  userId: string
  qualidade: number
  dificuldade: number
  tarefasRealizadas?: string
  dificuldades?: string
}) {
  validateRatings(params.qualidade, params.dificuldade)

  const existing = await prisma.sprintFeedback.findUnique({
    where: { sprintId_userId: { sprintId: params.sprintId, userId: params.userId } },
  })
  if (existing) throw new ConflictError('Você já enviou feedback para esta sprint')

  return prisma.sprintFeedback.create({
    data: {
      sprintId: params.sprintId,
      userId: params.userId,
      qualidade: params.qualidade,
      dificuldade: params.dificuldade,
      tarefasRealizadas: params.tarefasRealizadas,
      dificuldades: params.dificuldades,
    },
  })
}

export async function atualizarFeedback(
  sprintId: string,
  userId: string,
  data: {
    qualidade?: number
    dificuldade?: number
    tarefasRealizadas?: string
    dificuldades?: string
  },
) {
  if (data.qualidade !== undefined || data.dificuldade !== undefined) {
    validateRatings(data.qualidade ?? 3, data.dificuldade ?? 3)
  }

  const existing = await prisma.sprintFeedback.findUnique({
    where: { sprintId_userId: { sprintId, userId } },
  })
  if (!existing) throw new NotFoundError('Feedback não encontrado')

  return prisma.sprintFeedback.update({
    where: { id: existing.id },
    data,
  })
}

export async function listarPorSprint(sprintId: string) {
  return prisma.sprintFeedback.findMany({
    where: { sprintId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, cargo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function listarPorUsuario(userId: string) {
  return prisma.sprintFeedback.findMany({
    where: { userId },
    include: { sprint: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function calcularMediasDaSprint(sprintId: string) {
  const feedbacks = await prisma.sprintFeedback.findMany({
    where: { sprintId },
    select: { qualidade: true, dificuldade: true },
  })

  if (feedbacks.length === 0) return { mediaQualidade: 0, mediaDificuldade: 0, total: 0 }

  const mediaQualidade = feedbacks.reduce((sum, f) => sum + f.qualidade, 0) / feedbacks.length
  const mediaDificuldade = feedbacks.reduce((sum, f) => sum + f.dificuldade, 0) / feedbacks.length

  return { mediaQualidade, mediaDificuldade, total: feedbacks.length }
}

export async function buscarFeedbackDoUsuario(sprintId: string, userId: string) {
  return prisma.sprintFeedback.findUnique({
    where: { sprintId_userId: { sprintId, userId } },
  })
}
