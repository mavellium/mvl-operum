import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictException } from '@nestjs/common'
vi.mock('../prisma', () => ({ prisma: { $transaction: vi.fn() } }))
import { prisma } from '../prisma'
import { ProjectService } from './project.service'
const transaction = vi.mocked(prisma.$transaction)
const tx = {
  project: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  projectMacroFase: { findMany: vi.fn() },
}
beforeEach(() => {
  vi.resetAllMocks()
  tx.project.findFirst.mockResolvedValue({ id: 'p1' })
  tx.project.findUniqueOrThrow.mockResolvedValue({ id: 'p1', macroFasesRevision: 1 })
  tx.projectMacroFase.findMany.mockResolvedValue([])
  transaction.mockImplementation(async operation => (operation as (db: unknown) => Promise<unknown>)(tx) as never)
})
describe('substituição — retries limitados', () => {
  it.each([
    { code: 'P2034' },
    { name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict' } },
  ])('refaz a leitura inteira após conflito %j', async error => {
    transaction.mockRejectedValueOnce(error)
    expect(await new ProjectService().upsertMacroFase('p1', 't1', [])).toEqual({ count: 0 })
    expect(transaction).toHaveBeenCalledTimes(2)
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })
  it('retorna 409 após três tentativas', async () => {
    transaction.mockRejectedValue({ code: 'P2034' })
    await expect(new ProjectService().upsertMacroFase('p1', 't1', [])).rejects.toBeInstanceOf(ConflictException)
    expect(transaction).toHaveBeenCalledTimes(3)
  })
  it('não repete falhas de outro tipo', async () => {
    const error = { code: 'P2002' }
    transaction.mockRejectedValue(error)
    await expect(new ProjectService().upsertMacroFase('p1', 't1', [])).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
