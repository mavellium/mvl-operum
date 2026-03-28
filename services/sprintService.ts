import prisma from '@/lib/prisma'
import { SprintCreateSchema, SprintUpdateSchema } from '@/lib/validation/sprintSchemas'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function createSprint(input: { name: string; boardId: string; startDate?: Date | string; endDate?: Date | string }) {
  const parsed = SprintCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  return prisma.sprint.create({ data: parsed.data })
}

export async function updateSprint(id: string, input: Record<string, unknown>) {
  const existing = await prisma.sprint.findUnique({ where: { id } })
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
  return prisma.sprint.delete({ where: { id } })
}

export async function assignCardToSprint(cardId: string, sprintId: string | null) {
  return prisma.card.update({
    where: { id: cardId },
    data: { sprintId },
  })
}

export async function completeSprint(id: string) {
  await prisma.sprint.findUnique({ where: { id } })
  return prisma.sprint.update({
    where: { id },
    data: { status: 'COMPLETED' },
  })
}

export async function getSprintsForBoard(boardId: string) {
  return prisma.sprint.findMany({ where: { boardId }, orderBy: { createdAt: 'asc' } })
}
