import prisma from '@/lib/prisma'

export async function startTimer(userId: string, cardId: string) {
  // Stop any currently running timers for this user
  await prisma.timeEntry.updateMany({
    where: { userId, isRunning: true },
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
    where: { userId, cardId, isRunning: true },
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
    where: { userId, cardId, isRunning: true },
  })
}

export async function getTotalDuration(userId: string, cardId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { userId, cardId },
    _sum: { duration: true },
  })
  return result._sum.duration ?? 0
}

export async function getTotalDurationForSprint(sprintId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { card: { sprintId } },
    _sum: { duration: true },
  })
  return result._sum.duration ?? 0
}
