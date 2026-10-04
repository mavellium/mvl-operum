// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    timeEntry: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../common/tenant-scope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../common/tenant-scope')>()
  return { ...actual, assertCard: vi.fn(), assertTimeEntry: vi.fn(), assertUserInTenant: vi.fn() }
})

import { prisma } from '../prisma'
import { TimeEntryService } from './time-entry.service'

const db = prisma as unknown as { timeEntry: Record<string, ReturnType<typeof vi.fn>> }
const service = new TimeEntryService()

beforeEach(() => vi.resetAllMocks())

describe('getRunning', () => {
  it('busca o timer rodando do usuário dentro do tenant e embrulha em { entry }', async () => {
    const entry = { id: 't1', cardId: 'c1', isRunning: true, card: { id: 'c1', title: 'EAP' } }
    db.timeEntry.findFirst.mockResolvedValue(entry)

    await expect(service.getRunning('ten1', 'u1')).resolves.toEqual({ entry })
    expect(db.timeEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', isRunning: true, deletedAt: null, user: { tenantId: 'ten1' } },
    }))
  })

  it('sem timer rodando devolve { entry: null } (nunca corpo vazio)', async () => {
    db.timeEntry.findFirst.mockResolvedValue(null)
    await expect(service.getRunning('ten1', 'u1')).resolves.toEqual({ entry: null })
  })
})

describe('createManual', () => {
  it('grava com a duração em segundos', async () => {
    db.timeEntry.create.mockImplementation(async ({ data }) => data)
    const r = await service.createManual('ten1', 'c1', 'u1', {
      startedAt: '2026-09-29T10:00:00.000Z',
      endedAt: '2026-09-29T11:30:00.000Z',
    })
    expect(r).toMatchObject({ duration: 5400, isManual: true, cardId: 'c1', userId: 'u1' })
  })

  it.each([
    ['fim antes do início', '2026-09-29T11:00:00.000Z', '2026-09-29T10:00:00.000Z', /depois de startedAt/],
    ['fim igual ao início', '2026-09-29T10:00:00.000Z', '2026-09-29T10:00:00.000Z', /depois de startedAt/],
    ['data inválida', 'ontem', '2026-09-29T10:00:00.000Z', /datas válidas/],
  ])('recusa %s (antes gravava duração negativa ou NaN)', async (_caso, startedAt, endedAt, erro) => {
    await expect(service.createManual('ten1', 'c1', 'u1', { startedAt, endedAt })).rejects.toThrow(BadRequestException)
    await expect(service.createManual('ten1', 'c1', 'u1', { startedAt, endedAt })).rejects.toThrow(erro)
    expect(db.timeEntry.create).not.toHaveBeenCalled()
  })
})

describe('start — unicidade do timer', () => {
  it('timer já ativo responde conflito sem inserir outro', async () => {
    db.timeEntry.findFirst.mockResolvedValue({ id: 'existing' })
    await expect(service.start('ten1', 'c1', 'u1')).rejects.toMatchObject({ status: 409 })
    expect(db.timeEntry.create).not.toHaveBeenCalled()
  })

  it.each([
    { code: 'P2002', meta: { target: ['userId'] } },
    { code: 'P2002', meta: { target: 'TimeEntry_one_running_per_user' } },
    { code: 'P2002', meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['userId'] } } } } },
    { code: 'P2002', meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['"userId"'] } } } } },
    { code: 'P2002', meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index: 'TimeEntry_one_running_per_user' } } } } },
  ])('colisão do índice ativo retorna 409 no formato do Prisma/adapter', async error => {
    db.timeEntry.findFirst.mockResolvedValue(null)
    db.timeEntry.create.mockRejectedValue(error)
    await expect(service.start('ten1', 'c1', 'u1')).rejects.toMatchObject({ status: 409, message: 'Já existe um timer em andamento' })
  })

  it.each([
    { code: 'P2002', meta: { target: ['id'] } },
    { code: 'P2002', meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['"id"'] } } } } },
    { code: 'P2002', meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index: 'TimeEntry_pkey' } } } } },
    { code: 'P2002' },
    new Error('write failed'),
  ])('não disfarça outro erro de escrita como timer ativo', async error => {
    db.timeEntry.findFirst.mockResolvedValue(null)
    db.timeEntry.create.mockRejectedValue(error)
    await expect(service.start('ten1', 'c1', 'u1')).rejects.toBe(error)
  })

  it('recusa usuário não identificado antes de consultar/inserir', async () => {
    await expect(service.start('ten1', 'c1', '')).rejects.toThrow('Usuário não identificado')
    expect(db.timeEntry.findFirst).not.toHaveBeenCalled()
    expect(db.timeEntry.create).not.toHaveBeenCalled()
  })
})

describe('stop — idempotência', () => {
  it('registro parado retorna valores existentes sem escrita', async () => {
    const stopped = { id: 'e1', userId: 'u1', isRunning: false, duration: 15, endedAt: new Date('2026-10-04T10:00:00Z') }
    db.timeEntry.findFirst.mockResolvedValue(stopped)
    expect(await service.stop('ten1', 'e1', 'u1')).toBe(stopped)
    expect(db.timeEntry.updateMany).not.toHaveBeenCalled()
  })

  it('concorrente que perde a escrita retorna a parada já persistida', async () => {
    const stopped = { id: 'e1', userId: 'u1', isRunning: false, duration: 15, endedAt: new Date('2026-10-04T10:00:00Z') }
    db.timeEntry.findFirst.mockResolvedValueOnce({ ...stopped, isRunning: true, startedAt: new Date() }).mockResolvedValueOnce(stopped)
    db.timeEntry.updateMany.mockResolvedValue({ count: 0 })
    expect(await service.stop('ten1', 'e1', 'u1')).toBe(stopped)
    expect(db.timeEntry.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'e1', userId: 'u1', deletedAt: null, isRunning: true, user: { tenantId: 'ten1' } })
  })

  it('início no futuro não produz duração negativa por diferença de relógio', async () => {
    db.timeEntry.findFirst.mockResolvedValueOnce({ id: 'e1', userId: 'u1', isRunning: true, startedAt: new Date(Date.now() + 60000) }).mockResolvedValueOnce({ id: 'e1', isRunning: false, duration: 0 })
    db.timeEntry.updateMany.mockResolvedValue({ count: 1 })
    await service.stop('ten1', 'e1', 'u1')
    expect(db.timeEntry.updateMany.mock.calls[0][0].data.duration).toBe(0)
  })

  it('não recria registro removido durante a parada', async () => {
    db.timeEntry.findFirst.mockResolvedValueOnce({ id: 'e1', userId: 'u1', isRunning: true, startedAt: new Date() }).mockResolvedValueOnce(null)
    db.timeEntry.updateMany.mockResolvedValue({ count: 0 })
    await expect(service.stop('ten1', 'e1', 'u1')).rejects.toThrow('Time entry não encontrada')
    expect(db.timeEntry.create).not.toHaveBeenCalled()
  })
})
