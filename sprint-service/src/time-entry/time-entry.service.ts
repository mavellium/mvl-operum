import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertCard, assertTimeEntry, cardInTenant } from '../common/tenant-scope'

@Injectable()
export class TimeEntryService {
  async listByCard(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    return prisma.timeEntry.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { startedAt: 'desc' },
    })
  }

  async listByUser(tenantId: string, userId: string) {
    return prisma.timeEntry.findMany({
      where: { userId, deletedAt: null, user: { tenantId }, card: cardInTenant(tenantId) },
      orderBy: { startedAt: 'desc' },
    })
  }

  async start(tenantId: string, cardId: string, userId: string, description?: string) {
    await assertCard(tenantId, cardId)
    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true, deletedAt: null },
    })
    if (running) throw new BadRequestException('Já existe um timer em andamento')

    return prisma.timeEntry.create({
      data: { cardId, userId, isRunning: true, description },
    })
  }

  async stop(tenantId: string, id: string, userId: string) {
    await assertTimeEntry(tenantId, id)
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

  async createManual(tenantId: string, cardId: string, userId: string, data: { startedAt: string; endedAt: string; description?: string }) {
    await assertCard(tenantId, cardId)
    const start = new Date(data.startedAt)
    const end = new Date(data.endedAt)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    return prisma.timeEntry.create({
      data: { cardId, userId, startedAt: start, endedAt: end, duration, isManual: true, description: data.description },
    })
  }

  async getTotal(tenantId: string, cardId: string): Promise<{ seconds: number }> {
    await assertCard(tenantId, cardId)
    const entries = await prisma.timeEntry.findMany({
      where: { cardId, isRunning: false, deletedAt: null },
      select: { duration: true },
    })
    const seconds = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
    return { seconds }
  }

  async getActive(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    return prisma.timeEntry.findFirst({
      where: { cardId, isRunning: true, deletedAt: null },
    })
  }

  async remove(tenantId: string, id: string) {
    await assertTimeEntry(tenantId, id)
    await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
