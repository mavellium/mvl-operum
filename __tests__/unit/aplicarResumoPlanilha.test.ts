// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = vi.hoisted(() => ({
  project: { findFirst: vi.fn(), update: vi.fn() },
  wbsNode: { findMany: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  sprint: { findMany: vi.fn(), update: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }))
vi.mock('@/services/auditoriaService', () => ({ registrarAcao: vi.fn() }))

import { aplicarResumoDaPlanilha } from '@/services/wbsService'

beforeEach(() => {
  vi.resetAllMocks()
  tx.project.findFirst.mockResolvedValue({ endDate: null })
  tx.wbsNode.findFirst.mockResolvedValue({ id: 'r', version: 0 })
  tx.wbsNode.update.mockResolvedValue({ version: 1 })
  tx.sprint.findMany.mockResolvedValue([])
})

describe('aplicarResumoDaPlanilha', () => {
  it('grava data limite e custo da fase, data fim da sprint e do projeto', async () => {
    tx.wbsNode.findMany.mockResolvedValue([{ id: 'f1', properties: { sprintId: 's1', dataLimite: '2026-01-01' } }])
    tx.sprint.findMany.mockResolvedValue([{ id: 's1', endDate: null }])
    const r = await aplicarResumoDaPlanilha('p1', 't1', [{ nodeId: 'f1', dataFim: '2026-11-01', custo: 123.45 }], '2027-12-01')
    expect(r).toEqual({ fasesAtualizadas: 1, sprintsAtualizadas: 1, projetoAtualizado: true })
    expect(tx.wbsNode.update).toHaveBeenCalledWith({ where: { id: 'f1' }, data: { properties: { sprintId: 's1', dataLimite: '2026-11-01', custo: 123.45 } } })
    expect(tx.sprint.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { endDate: new Date('2026-11-01') } })
    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { endDate: new Date('2027-12-01') } })
  })

  it('sem data/custo calculado mantém o que foi informado à mão e não grava nada igual', async () => {
    tx.wbsNode.findMany.mockResolvedValue([{ id: 'f1', properties: { dataLimite: '2026-05-05', custo: 10 } }])
    tx.project.findFirst.mockResolvedValue({ endDate: new Date('2027-12-01') })
    const r = await aplicarResumoDaPlanilha('p1', 't1', [{ nodeId: 'f1', dataFim: null, custo: null }], '2027-12-01')
    expect(r).toEqual({ fasesAtualizadas: 0, sprintsAtualizadas: 0, projetoAtualizado: false })
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
    expect(tx.project.update).not.toHaveBeenCalled()
  })
})
