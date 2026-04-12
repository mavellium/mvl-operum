import prisma from '@/lib/prisma'
import { SprintCreateSchema, SprintUpdateSchema } from '@/lib/validation/sprintSchemas'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function createSprint(input: { name: string; startDate?: Date | string; endDate?: Date | string; createdBy?: string }) {
  const parsed = SprintCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  return prisma.sprint.create({ data: parsed.data })
}

export async function updateSprint(id: string, input: Record<string, unknown>) {
  const existing = await prisma.sprint.findUnique({ where: { id, deletedAt: null } })
  if (!existing) {
    throw new NotFoundError(`Sprint não encontrado: ${id}`)
  }

  const parsed = SprintUpdateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  return prisma.sprint.update({ where: { id }, data: parsed.data })
}

export async function deleteSprint(id: string) {
  return prisma.sprint.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function completeSprint(id: string) {
  await prisma.sprint.findUnique({ where: { id } })
  return prisma.sprint.update({
    where: { id },
    data: { status: 'COMPLETED' },
  })
}

export async function getAllSprints() {
  return prisma.sprint.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findAllByProjeto(projetoId: string) {
  return prisma.sprint.findMany({
    where: { projectId: projetoId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}
