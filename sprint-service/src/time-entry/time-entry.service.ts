import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { prisma } from '../prisma'

@Injectable()
export class TimeEntryService {
  async listByCard(cardId: string) {
    return prisma.timeEntry.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { startedAt: 'desc' },
    })
  }

  async listByUser(userId: string) {
    return prisma.timeEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { startedAt: 'desc' },
    })
  }

  async start(cardId: string, userId: string, description?: string) {
    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true, deletedAt: null },
    })
    if (running) throw new BadRequestException('Já existe um timer em andamento')

    return prisma.timeEntry.create({
      data: { cardId, userId, isRunning: true, description },
    })
  }

  async stop(id: string, userId: string) {
    const entry = await prisma.timeEntry.findUnique({ where: { id } })
    if (!entry || entry.deletedAt || entry.userId !== userId) {
      throw new NotFoundException('Time entry não encontrada')
    }
    const endedAt = new Date()
    const duration = Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000)
    return prisma.timeEntry.update({
      where: { id },
      data: { endedAt, duration, isRunning: false },
    })
  }

  async createManual(cardId: string, userId: string, data: { startedAt: string; endedAt: string; description?: string }) {
    const start = new Date(data.startedAt)
    const end = new Date(data.endedAt)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    return prisma.timeEntry.create({
      data: { cardId, userId, startedAt: start, endedAt: end, duration, isManual: true, description: data.description },
    })
  }

  async getTotal(cardId: string): Promise<{ seconds: number }> {
    const entries = await prisma.timeEntry.findMany({
      where: { cardId, isRunning: false, deletedAt: null },
      select: { duration: true },
    })
    const seconds = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
    return { seconds }
  }

  async getActive(cardId: string) {
    return prisma.timeEntry.findFirst({
      where: { cardId, isRunning: true, deletedAt: null },
    })
  }

  async remove(id: string) {
    const entry = await prisma.timeEntry.findUnique({ where: { id } })
    if (!entry) throw new NotFoundException('Time entry não encontrada')
    await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
