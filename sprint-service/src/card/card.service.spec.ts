// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException, NotFoundException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    card: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    sprint: { findUnique: vi.fn() },
    sprintColumn: { findUnique: vi.fn() },
    cardMovement: { create: vi.fn(), findMany: vi.fn() },
    cardTag: { upsert: vi.fn(), delete: vi.fn() },
    cardResponsible: { upsert: vi.fn(), delete: vi.fn() },
    tag: { delete: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../common/tenant-scope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../common/tenant-scope')>()
  return {
    ...actual,
    assertProject: vi.fn(),
    assertSprint: vi.fn(),
    assertColumn: vi.fn(),
    assertCard: vi.fn(),
    assertTag: vi.fn(),
    assertUserInTenant: vi.fn(),
  }
})

import { prisma } from '../prisma'
import * as scope from '../common/tenant-scope'
import { CardService } from './card.service'

const db = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>
  card: Record<string, ReturnType<typeof vi.fn>>
  sprint: Record<string, ReturnType<typeof vi.fn>>
  sprintColumn: Record<string, ReturnType<typeof vi.fn>>
  cardResponsible: Record<string, ReturnType<typeof vi.fn>>
  cardTag: Record<string, ReturnType<typeof vi.fn>>
  tag: Record<string, ReturnType<typeof vi.fn>>
  cardMovement: Record<string, ReturnType<typeof vi.fn>>
}
const assert = scope as unknown as Record<string, ReturnType<typeof vi.fn>>

const notFound = () => Promise.reject(new NotFoundException())

let service: CardService

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of ['assertProject', 'assertSprint', 'assertColumn', 'assertCard', 'assertTag', 'assertUserInTenant']) {
    assert[fn].mockResolvedValue(undefined)
  }
  service = new CardService()
})

describe('CardService — leitura escopada por tenant', () => {
  it('findOne filtra pelo tenant (backlog ou sprint) e responde 404 fora dele', async () => {
    db.card.findFirst.mockResolvedValue(null)
    await expect(service.findOne('t1', 'card-b')).rejects.toThrow(NotFoundException)
    expect(db.card.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'card-b', ...scope.cardInTenant('t1') })
  })

  it('não expõe a linha User inteira dos responsáveis', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'c1' })
    await service.findOne('t1', 'c1')
    expect(db.card.findFirst.mock.calls[0][0].include.responsibles).toEqual({
      include: { user: { select: { id: true, name: true, email: true } } },
    })
  })

  it('listBySprint e listBacklog validam sprint/projeto antes de listar', async () => {
    assert.assertSprint.mockImplementation(notFound)
    await expect(service.listBySprint('t1', 's-outro')).rejects.toThrow(NotFoundException)
    assert.assertProject.mockImplementation(notFound)
    await expect(service.listBacklog('t1', 'p-outro')).rejects.toThrow(NotFoundException)
    expect(db.card.findMany).not.toHaveBeenCalled()
  })

  it('search sempre inclui o filtro de tenant', async () => {
    db.card.findMany.mockResolvedValue([])
    await service.search('t1', 'bug')
    expect(db.card.findMany.mock.calls[0][0].where.AND).toEqual([scope.cardInTenant('t1')])
  })
})

describe('CardService — escrita escopada por tenant', () => {
  it('create exige projectId ou sprintId', async () => {
    await expect(service.create('t1', { title: 'x' })).rejects.toThrow(BadRequestException)
    expect(db.card.create).not.toHaveBeenCalled()
  })

  it('create rejeita projeto de outro tenant', async () => {
    assert.assertProject.mockImplementation(notFound)
    await expect(service.create('t1', { title: 'x', projectId: 'p-outro' })).rejects.toThrow(NotFoundException)
    expect(db.card.create).not.toHaveBeenCalled()
  })

  it('create exige que a coluna pertença à sprint informada', async () => {
    await expect(service.create('t1', { title: 'x', projectId: 'p1', sprintColumnId: 'c1' })).rejects.toThrow(
      BadRequestException,
    )
    assert.assertColumn.mockImplementation(notFound)
    await expect(service.create('t1', { title: 'x', sprintId: 's1', sprintColumnId: 'c-outra' })).rejects.toThrow(
      NotFoundException,
    )
    expect(db.card.create).not.toHaveBeenCalled()
  })

  it('update não altera card de outro tenant', async () => {
    db.card.findFirst.mockResolvedValue(null)
    await expect(service.update('t1', 'card-b', { title: 'hack' })).rejects.toThrow(NotFoundException)
    expect(db.card.update).not.toHaveBeenCalled()
  })

  it('update impede mover o card para sprint de outro tenant', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1', sprintId: null, sprintColumnId: null })
    assert.assertSprint.mockImplementation(notFound)
    await expect(service.update('t1', 'c1', { sprintId: 's-outra' })).rejects.toThrow(NotFoundException)
    expect(db.card.update).not.toHaveBeenCalled()
  })

  it('update valida a coluna nova contra a sprint atual do card', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1', sprintId: 's1', sprintColumnId: 'c-a' })
    db.card.update.mockResolvedValue({})
    await service.update('t1', 'c1', { sprintColumnId: 'c-b' })
    expect(assert.assertColumn).toHaveBeenCalledWith('t1', 's1', 'c-b')
  })

  it('ao voltar ao backlog, card sem projectId herda o projeto da sprint', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'c1', projectId: null, sprintId: 's1', sprintColumnId: 'c-a' })
    db.sprint.findUnique.mockResolvedValue({ projectId: 'p1' })
    db.card.update.mockResolvedValue({})
    await service.update('t1', 'c1', { sprintId: null, sprintColumnId: null, sprintPosition: null })
    expect(db.card.update.mock.calls[0][0].data).toMatchObject({ projectId: 'p1', sprintId: null })
  })

  it('update com endDate null remove o prazo; sem endDate não mexe', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1', sprintId: null, sprintColumnId: null })
    db.card.update.mockResolvedValue({})
    await service.update('t1', 'c1', { endDate: null })
    expect(db.card.update.mock.calls[0][0].data.endDate).toBeNull()
    expect(db.card.update.mock.calls[0][0].data.startDate).toBeUndefined()

    await service.update('t1', 'c1', { endDate: '2026-09-30T23:59:00.000Z' })
    expect(db.card.update.mock.calls[1][0].data.endDate).toEqual(new Date('2026-09-30T23:59:00.000Z'))
  })

  it('mover para o topo renumera a coluna inteira (sem posições repetidas)', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'C', projectId: 'p1', sprintId: 's1', sprintColumnId: 'col' })
    db.card.update.mockImplementation(async (args: { where: { id: string }; data: object }) => ({ id: args.where.id, ...args.data }))
    db.card.findMany.mockResolvedValue([
      { id: 'A', sprintPosition: 0 },
      { id: 'B', sprintPosition: 1 },
    ])
    db.$transaction.mockResolvedValue([])

    await service.update('t1', 'C', { sprintColumnId: 'col', sprintPosition: 0 })

    const renumber = db.card.update.mock.calls.slice(1).map(([a]) => [a.where.id, a.data.sprintPosition])
    // C já foi gravado na posição 0 pelo update principal; A e B descem uma posição.
    expect(renumber).toEqual([['A', 1], ['B', 2]])
    expect(db.card.findMany.mock.calls[0][0].where).toMatchObject({ sprintColumnId: 'col', id: { not: 'C' } })
  })

  it('mudar de coluna renumera também a coluna de origem', async () => {
    db.card.findFirst.mockResolvedValue({ id: 'X', projectId: 'p1', sprintId: 's1', sprintColumnId: 'origem' })
    db.sprintColumn.findUnique.mockResolvedValue({ title: 'col' })
    db.card.update.mockResolvedValue({})
    db.card.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'Y', sprintPosition: 1 }])
    db.$transaction.mockResolvedValue([])

    await service.update('t1', 'X', { sprintColumnId: 'destino', sprintPosition: 0 })

    expect(db.card.findMany.mock.calls.map(([a]) => a.where.sprintColumnId)).toEqual(['destino', 'origem'])
    expect(db.card.update).toHaveBeenCalledWith({ where: { id: 'Y' }, data: { sprintPosition: 0 } })
  })

  it('addResponsible rejeita usuário de outro tenant', async () => {
    assert.assertUserInTenant.mockImplementation(notFound)
    await expect(service.addResponsible('t1', 'c1', 'u-outro')).rejects.toThrow(NotFoundException)
    expect(db.cardResponsible.upsert).not.toHaveBeenCalled()
  })

  it('addTag rejeita tag de outro tenant', async () => {
    assert.assertTag.mockImplementation(notFound)
    await expect(service.addTag('t1', 'c1', 'g-outra')).rejects.toThrow(NotFoundException)
    expect(db.cardTag.upsert).not.toHaveBeenCalled()
  })

  it('remove/removeTag/removeResponsible/listMovements validam o card', async () => {
    assert.assertCard.mockImplementation(notFound)
    await expect(service.remove('t1', 'c')).rejects.toThrow(NotFoundException)
    await expect(service.removeTag('t1', 'c', 'g')).rejects.toThrow(NotFoundException)
    await expect(service.removeResponsible('t1', 'c', 'u')).rejects.toThrow(NotFoundException)
    await expect(service.listMovements('t1', 'c')).rejects.toThrow(NotFoundException)
    expect(db.card.update).not.toHaveBeenCalled()
    expect(db.cardTag.delete).not.toHaveBeenCalled()
    expect(db.cardResponsible.delete).not.toHaveBeenCalled()
    expect(db.cardMovement.findMany).not.toHaveBeenCalled()
  })

  it('deleteTag rejeita tag de outro tenant', async () => {
    assert.assertTag.mockImplementation(notFound)
    await expect(service.deleteTag('t1', 'g-outra')).rejects.toThrow(NotFoundException)
    expect(db.tag.delete).not.toHaveBeenCalled()
  })
})
