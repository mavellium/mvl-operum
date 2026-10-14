// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  project: { findFirst: vi.fn() },
  wbsNode: { findMany: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
  card: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  sprint: { findFirst: vi.fn() },
  sprintColumn: { findMany: vi.fn(), findFirst: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }))
vi.mock('@/services/auditoriaService', () => ({ registrarAcao: vi.fn() }))

import { sincronizarEapComSprint } from '@/services/wbsService'

const node = (id: string, parentId: string | null, title: string, props: object = {}, updatedAt = new Date('2026-10-01')) =>
  ({ id, parentId, title, order: 0, code: '', properties: props, updatedAt })

beforeEach(() => {
  vi.resetAllMocks()
  tx.project.findFirst.mockResolvedValue({ id: 'p1' })
  tx.wbsNode.count.mockResolvedValue(1)
  tx.wbsNode.findFirst.mockResolvedValue({ id: 'r', version: 0 })
  tx.wbsNode.update.mockResolvedValue({ version: 1 })
  tx.sprint.findFirst.mockResolvedValueOnce({ id: 's1' })
  tx.sprintColumn.findMany.mockResolvedValue([{ id: 'c0' }])
  tx.sprintColumn.findFirst.mockResolvedValue({ id: 'cAFazer' })
  tx.card.aggregate.mockResolvedValue({ _max: { sprintPosition: 4 } })
  tx.card.create.mockResolvedValue({ id: 'card-novo' })
})

describe('sincronizarEapComSprint', () => {
  it('folha sem card vira card em "A Fazer" da sprint e guarda o vínculo no nó', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([node('r', null, 'Projeto'), node('n1', 'r', 'Modelar banco')]).mockResolvedValue([])
    tx.card.findMany.mockResolvedValue([])
    const r = await sincronizarEapComSprint('p1', 't1')
    expect(r.cardsCriados).toBe(1)
    expect(tx.card.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: 'Modelar banco', sprintId: 's1', sprintColumnId: 'cAFazer', sprintPosition: 5, projectId: 'p1' }),
    }))
    expect(tx.wbsNode.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { properties: { cardId: 'card-novo' } } })
  })

  it('card criado na sprint vira nó filho da raiz, com o vínculo', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([node('r', null, 'Projeto')]).mockResolvedValue([])
    tx.card.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'cx', title: 'Ajustar login', description: '', updatedAt: new Date() }])
    const r = await sincronizarEapComSprint('p1', 't1')
    expect(r.nosCriados).toBe(1)
    expect(tx.wbsNode.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ parentId: 'r', title: 'Ajustar login', properties: { cardId: 'cx' } }),
    }))
    expect(tx.card.create).not.toHaveBeenCalled()
  })

  it('título igual sem vínculo é vinculado, sem duplicar nem criar card/nó', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([node('r', null, 'Projeto'), node('n1', 'r', 'Tela de login')]).mockResolvedValue([])
    tx.card.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'c9', title: ' tela de LOGIN ', description: '', updatedAt: new Date() }])
    const r = await sincronizarEapComSprint('p1', 't1')
    expect(r).toEqual({ cardsCriados: 0, nosCriados: 0, titulosAtualizados: 0 })
    expect(tx.wbsNode.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { properties: { cardId: 'c9' } } })
    expect(tx.card.create).not.toHaveBeenCalled()
    expect(tx.wbsNode.create).not.toHaveBeenCalled()
  })

  it('já sincronizado não escreve nada (idempotente) e card excluído não é recriado', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([node('r', null, 'Projeto'), node('n1', 'r', 'A', { cardId: 'c1' }), node('n2', 'r', 'B', { cardId: 'c2' })])
    tx.card.findMany
      .mockResolvedValueOnce([
        { id: 'c1', title: 'A', deletedAt: null, updatedAt: new Date('2026-10-01') },
        { id: 'c2', title: 'B', deletedAt: new Date(), updatedAt: new Date('2026-10-01') },
      ])
      .mockResolvedValueOnce([{ id: 'c1', title: 'A', description: '', updatedAt: new Date() }])
    const r = await sincronizarEapComSprint('p1', 't1')
    expect(r).toEqual({ cardsCriados: 0, nosCriados: 0, titulosAtualizados: 0 })
    expect(tx.card.create).not.toHaveBeenCalled()
    expect(tx.wbsNode.create).not.toHaveBeenCalled()
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
  })

  it('título alterado por último vence: card mais novo atualiza o nó', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([node('r', null, 'Projeto'), node('n1', 'r', 'Velho', { cardId: 'c1' }, new Date('2026-10-01'))]).mockResolvedValue([])
    tx.card.findMany
      .mockResolvedValueOnce([{ id: 'c1', title: 'Novo', deletedAt: null, updatedAt: new Date('2026-10-05') }])
      .mockResolvedValueOnce([{ id: 'c1', title: 'Novo', description: '', updatedAt: new Date('2026-10-05') }])
    const r = await sincronizarEapComSprint('p1', 't1')
    expect(r.titulosAtualizados).toBe(1)
    expect(tx.wbsNode.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { title: 'Novo' } })
  })

  it('sem raiz (EAP ainda não criada) não cria nada', async () => {
    tx.wbsNode.findMany.mockResolvedValueOnce([])
    expect(await sincronizarEapComSprint('p1', 't1')).toEqual({ cardsCriados: 0, nosCriados: 0, titulosAtualizados: 0 })
    expect(tx.card.create).not.toHaveBeenCalled()
  })
})
