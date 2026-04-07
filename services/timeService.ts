import prisma from '@/lib/prisma'

export async function startTimer(userId: string, cardId: string) {
  // Stop any currently running timers for this user
  await prisma.timeEntry.updateMany({
    where: { userId, isRunning: true, deletedAt: null },
    data: {
      isRunning: false,
      endedAt: new Date(),
    },
  })

  return prisma.timeEntry.create({
    data: {
      userId,
      cardId,
      isRunning: true,
      startedAt: new Date(),
      duration: 0,
    },
  })
}

export async function pauseTimer(userId: string, cardId: string) {
  const running = await prisma.timeEntry.findFirst({
    where: { userId, cardId, isRunning: true, deletedAt: null },
  })
  if (!running) return null

  const now = new Date()
  const elapsed = Math.floor((now.getTime() - running.startedAt.getTime()) / 1000)
  const newDuration = running.duration + elapsed

  return prisma.timeEntry.update({
    where: { id: running.id },
    data: {
      isRunning: false,
      endedAt: now,
      duration: newDuration,
    },
  })
}

export async function getActiveTimer(userId: string, cardId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, cardId, isRunning: true, deletedAt: null },
  })
}

export async function getTotalDuration(userId: string, cardId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { userId, cardId, deletedAt: null },
    _sum: { duration: true },
  })
  return result._sum.duration ?? 0
}

export async function addManualTimeEntry(userId: string, cardId: string, seconds: number, description?: string) {
  const now = new Date()
  return prisma.timeEntry.create({
    data: {
      userId,
      cardId,
      isManual: true,
      isRunning: false,
      duration: seconds,
      description: description ?? null,
      startedAt: now,
      endedAt: now,
    },
  })
}

export async function getTimeEntries(userId: string, cardId: string) {
  return prisma.timeEntry.findMany({
    where: { userId, cardId, isRunning: false, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateTimeEntry(
  entryId: string,
  userId: string,
  data: { duration?: number; description?: string | null },
) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } })
  if (!entry) throw new Error('Registro não encontrado')
  if (entry.userId !== userId) throw new Error('Sem permissão para editar este registro')
  return prisma.timeEntry.update({ where: { id: entryId }, data })
}

export async function deleteTimeEntry(entryId: string, userId: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } })
  if (!entry) throw new Error('Registro não encontrado')
  if (entry.userId !== userId) throw new Error('Sem permissão para excluir este registro')
  return prisma.timeEntry.update({
    where: { id: entryId },
    data: { deletedAt: new Date() },
  })
}

export async function getTotalDurationForSprint(sprintId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { card: { sprintId }, deletedAt: null },
    _sum: { duration: true },
  })
  return result._sum.duration ?? 0
}
