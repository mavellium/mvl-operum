import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertCard, assertTimeEntry, assertUserInTenant, cardInTenant } from '../common/tenant-scope'
import { LIMITE_SEGUNDOS, MARCA_REVISAO, conflito, erroDoIntervalo, mensagemConflito, venceu } from './regras-tempo'
import { avisarTimerEncerrado } from './aviso-timer'

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

export interface UpdateTimeEntryDto {
  duration?: number
  startedAt?: string
  endedAt?: string
  description?: string | null
}

@Injectable()
export class TimeEntryService {
  /**
   * Timer rodando há mais de 12 h: encerra no limite, marca para revisão e avisa o
   * dono. Roda nas leituras e no início de outro timer, então um timer esquecido
   * nunca soma mais que o limite (ADR-046).
   */
  private async encerrarVencidos(where: { userId?: string; cardId?: string }) {
    const agora = new Date()
    const rodando = await prisma.timeEntry.findMany({
      where: { ...where, isRunning: true, deletedAt: null },
      include: { card: { select: { id: true, title: true, sprintId: true } } },
    })
    for (const e of rodando) {
      if (!venceu(e.startedAt, agora)) continue
      const endedAt = new Date(e.startedAt.getTime() + LIMITE_SEGUNDOS * 1000)
      const { count } = await prisma.timeEntry.updateMany({
        where: { id: e.id, isRunning: true },
        data: { isRunning: false, endedAt, duration: LIMITE_SEGUNDOS, description: [MARCA_REVISAO, e.description].filter(Boolean).join(' ') },
      })
      if (count) await avisarTimerEncerrado(e.userId, e.card)
    }
  }

  /** Recusa intervalo inválido ou sobreposto a outro lançamento do mesmo usuário. */
  private async validarIntervalo(userId: string, inicio: Date, fim: Date, ignorar?: string) {
    const agora = new Date()
    const erro = erroDoIntervalo({ inicio, fim }, agora)
    if (erro) throw new BadRequestException(erro)
    const vizinhos = await prisma.timeEntry.findMany({
      where: { userId, deletedAt: null, startedAt: { lt: fim }, OR: [{ endedAt: null }, { endedAt: { gt: inicio } }] },
      include: { card: { select: { title: true } } },
      take: 5,
    })
    const c = conflito({ inicio, fim }, vizinhos.map(v => ({ ...v, cardTitle: v.card?.title })), agora, ignorar)
    if (c) throw new ConflictException(mensagemConflito(c))
  }

  async listByCard(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    await this.encerrarVencidos({ cardId })
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
    await this.encerrarVencidos({ userId })
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

    // Passou do limite: fecha no limite e marca para revisão, em vez de gravar dias.
    const agora = new Date()
    const vencido = venceu(entry.startedAt, agora)
    const endedAt = vencido ? new Date(entry.startedAt.getTime() + LIMITE_SEGUNDOS * 1000) : agora
    const duration = Math.max(0, Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000))
    // PostgreSQL rechecks isRunning after waiting for another stop's row lock.
    // Only the winner writes; retries return the already persisted interval.
    await prisma.timeEntry.updateMany({
      where: { ...where, isRunning: true },
      data: { endedAt, duration, isRunning: false, ...(vencido ? { description: [MARCA_REVISAO, entry.description].filter(Boolean).join(' ') } : {}) },
    })
    const stopped = await prisma.timeEntry.findFirst({ where })
    if (!stopped) throw new NotFoundException('Time entry não encontrada')
    return stopped
  }

  async createManual(tenantId: string, cardId: string, userId: string, data: { startedAt: string; endedAt: string; description?: string }) {
    await assertCard(tenantId, cardId)
    const start = new Date(data.startedAt)
    const end = new Date(data.endedAt)
    // Datas válidas, fim depois do início, não no futuro, até 12 h e sem sobrepor outro lançamento do usuário.
    await this.validarIntervalo(userId, start, end)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    return prisma.timeEntry.create({
      data: { cardId, userId, startedAt: start, endedAt: end, duration, isManual: true, description: data.description },
    })
  }

  /**
   * Edita um lançamento já encerrado: duração (recalcula o fim a partir do início),
   * início/fim e descrição. Quem pode (dono ou admin) é conferido no gateway.
   */
  async update(tenantId: string, id: string, dto: UpdateTimeEntryDto) {
    await assertTimeEntry(tenantId, id)
    const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id } })
    if (entry.isRunning) throw new ConflictException('Pare o timer antes de editar este lançamento.')
    if (dto.duration !== undefined && (!Number.isInteger(dto.duration) || dto.duration <= 0)) {
      throw new BadRequestException('A duração deve ser um número inteiro de segundos maior que zero.')
    }
    const inicio = dto.startedAt ? new Date(dto.startedAt) : entry.startedAt
    const fim = dto.endedAt ? new Date(dto.endedAt)
      : dto.duration !== undefined ? new Date(inicio.getTime() + dto.duration * 1000)
      : entry.endedAt ?? new Date(inicio.getTime() + (entry.duration ?? 0) * 1000)
    await this.validarIntervalo(entry.userId, inicio, fim, entry.id)
    return prisma.timeEntry.update({
      where: { id },
      data: {
        startedAt: inicio, endedAt: fim, duration: Math.floor((fim.getTime() - inicio.getTime()) / 1000),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    })
  }

  async getTotal(tenantId: string, cardId: string): Promise<{ seconds: number }> {
    await assertCard(tenantId, cardId)
    await this.encerrarVencidos({ cardId })
    const entries = await prisma.timeEntry.findMany({
      where: { cardId, isRunning: false, deletedAt: null },
      select: { duration: true },
    })
    const seconds = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
    return { seconds }
  }

  async getActive(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    await this.encerrarVencidos({ cardId })
    return prisma.timeEntry.findFirst({
      where: { cardId, isRunning: true, deletedAt: null },
    })
  }

  /**
   * Timer rodando do usuário, em qualquer card do tenant, ou null. Vem
   * embrulhado em { entry } porque um null puro sai como corpo vazio.
   */
  async getRunning(tenantId: string, userId: string) {
    await this.encerrarVencidos({ userId })
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
