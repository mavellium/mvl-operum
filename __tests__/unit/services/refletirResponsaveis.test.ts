// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = vi.hoisted(() => ({
  wbsNode: { findFirst: vi.fn(), update: vi.fn() },
  cardResponsible: { findMany: vi.fn() },
  wbsTree: { upsert: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }))
vi.mock('@/services/auditoriaService', () => ({ registrarAcao: vi.fn() }))

import { refletirResponsaveisNoNo } from '@/services/wbsService'

beforeEach(() => {
  vi.resetAllMocks()
  tx.wbsNode.update.mockResolvedValue({ version: 3 })
})

describe('refletirResponsaveisNoNo', () => {
  it('nó ligado ao card passa a ter os responsáveis em Elaborado por', async () => {
    tx.wbsNode.findFirst.mockResolvedValueOnce({ id: 'n1', projectId: 'p1', tenantId: 't1', properties: { cardId: 'c1', tempoMinutos: 30 } })
      .mockResolvedValue({ id: 'r', version: 2 })
    tx.cardResponsible.findMany.mockResolvedValue([{ userId: 'ana', user: { name: 'Ana' } }, { userId: 'bia', user: { name: 'Bia' } }])
    expect(await refletirResponsaveisNoNo('c1')).toBe(true)
    expect(tx.wbsNode.findFirst.mock.calls[0][0].where).toEqual({ properties: { path: ['cardId'], equals: 'c1' } })
    expect(tx.wbsNode.update.mock.calls[0][0]).toEqual({ where: { id: 'n1' }, data: { properties: {
      cardId: 'c1', tempoMinutos: 30, elaboradoPorUserIds: ['ana', 'bia'], elaboradoPorUserId: 'ana', elaboradoPor: 'Ana, Bia', elaboradoSincronizado: true,
    } } })
  })

  it('card sem nó na EAP: nada a fazer', async () => {
    tx.wbsNode.findFirst.mockResolvedValue(null)
    expect(await refletirResponsaveisNoNo('c9')).toBe(false)
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
  })

  it('já igual: não grava nem muda a versão', async () => {
    tx.wbsNode.findFirst.mockResolvedValueOnce({ id: 'n1', projectId: 'p1', tenantId: 't1', properties: { cardId: 'c1', elaboradoPorUserIds: ['ana'], elaboradoPor: 'Ana', elaboradoSincronizado: true } })
    tx.cardResponsible.findMany.mockResolvedValue([{ userId: 'ana', user: { name: 'Ana' } }])
    expect(await refletirResponsaveisNoNo('c1')).toBe(true)
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
  })
})
