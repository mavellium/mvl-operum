import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertCard, assertTimeEntry, assertUserInTenant, cardInTenant } from '../common/tenant-scope'

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function userIdConstraint(fields: unknown): boolean {
  return Array.isArray(fields) && fields.length === 1 && (fields[0] === 'userId' || fields[0] === '"userId"')
}

/** Prisma and the PostgreSQL adapter report partial indexes differently. */
function isRunningTimerConflict(error: unknown): boolean {
  const details = record(error)
  if (details?.code !== 'P2002') return false
  const meta = record(details.meta)
  if (meta?.target === 'TimeEntry_one_running_per_user' ||
    userIdConstraint(meta?.target)) return true
  const cause = record(record(meta?.driverAdapterError)?.cause)
  const constraint = record(cause?.constraint)
  return cause?.kind === 'UniqueConstraintViolation' &&
    (constraint?.index === 'TimeEntry_one_running_per_user' || userIdConstraint(constraint?.fields))
}

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
    if (!userId) throw new BadRequestException('Usuário não identificado')
    await assertCard(tenantId, cardId)
    await assertUserInTenant(tenantId, userId)
    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true, deletedAt: null },
    })
    if (running) throw new ConflictException('Já existe um timer em andamento')

    try {
      return await prisma.timeEntry.create({
        data: { cardId, userId, isRunning: true, description },
      })
    } catch (error) {
      // Another request may have started a timer after the pre-check.
      if (isRunningTimerConflict(error)) throw new ConflictException('Já existe um timer em andamento')
      throw error
    }
  }

  async stop(tenantId: string, id: string, userId: string) {
    if (!userId) throw new BadRequestException('Usuário não identificado')
    const where = { id, userId, deletedAt: null, user: { tenantId }, card: cardInTenant(tenantId) }
    const entry = await prisma.timeEntry.findFirst({ where })
    if (!entry) throw new NotFoundException('Time entry não encontrada')
    if (!entry.isRunning) return entry

    const endedAt = new Date()
    const duration = Math.max(0, Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000))
    // PostgreSQL rechecks isRunning after waiting for another stop's row lock.
    // Only the winner writes; retries return the already persisted interval.
    await prisma.timeEntry.updateMany({
      where: { ...where, isRunning: true },
      data: { endedAt, duration, isRunning: false },
    })
    const stopped = await prisma.timeEntry.findFirst({ where })
    if (!stopped) throw new NotFoundException('Time entry não encontrada')
    return stopped
  }

  async createManual(tenantId: string, cardId: string, userId: string, data: { startedAt: string; endedAt: string; description?: string }) {
    await assertCard(tenantId, cardId)
    const start = new Date(data.startedAt)
    const end = new Date(data.endedAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('startedAt e endedAt devem ser datas válidas')
    }
    // Sem isto, fim antes do início gravava duração negativa e abatia o total do card.
    if (end <= start) throw new BadRequestException('endedAt deve ser depois de startedAt')
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

  /**
   * Timer rodando do usuário, em qualquer card do tenant, ou null. Vem
   * embrulhado em { entry } porque um null puro sai como corpo vazio.
   */
  async getRunning(tenantId: string, userId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true, deletedAt: null, user: { tenantId } },
      include: { card: { select: { id: true, title: true, sprintId: true, deletedAt: true } } },
    })
    return { entry }
  }

  async remove(tenantId: string, id: string) {
    await assertTimeEntry(tenantId, id)
    await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
