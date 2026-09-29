// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    timeEntry: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../common/tenant-scope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../common/tenant-scope')>()
  return { ...actual, assertCard: vi.fn(), assertTimeEntry: vi.fn() }
})

import { prisma } from '../prisma'
import { TimeEntryService } from './time-entry.service'

const db = prisma as unknown as { timeEntry: Record<string, ReturnType<typeof vi.fn>> }
const service = new TimeEntryService()

beforeEach(() => vi.clearAllMocks())

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
