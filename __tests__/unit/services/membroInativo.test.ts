// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
const db = vi.hoisted(() => ({
  userProject: { findMany: vi.fn() },
  card: { findMany: vi.fn() },
  cardResponsible: { findMany: vi.fn() },
  userProjectRole: { findMany: vi.fn() },
  project: { findUnique: vi.fn() },
  sprintColumn: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: db }))
const publish = vi.hoisted(() => vi.fn())
vi.mock('@/lib/notificationPublisher', () => ({ publishNotification: publish }))

import { cardsSemResponsavelAtivo, notificarPendenciasDoMembroInativo, bloqueioDeConclusao } from '@/services/membroInativo'

const card = (id: string, coluna: string | null, responsaveis: string[], sprintId: string | null = 's1') => ({
  id, title: `Card ${id}`, sprintId, sprintColumn: coluna ? { title: coluna } : null,
  responsibles: responsaveis.map(userId => ({ userId })),
})

beforeEach(() => {
  vi.clearAllMocks()
  publish.mockResolvedValue(undefined)
})

describe('cardsSemResponsavelAtivo', () => {
  it('só cards abertos cujos responsáveis estão todos inativos', async () => {
    db.card.findMany.mockResolvedValue([
      card('c1', 'A Fazer', ['u1']),
      card('c2', 'A Fazer', ['u1', 'u9']),
      card('c3', 'Concluído', ['u1']),
      card('c4', null, ['u1'], null),
    ])
    const r = await cardsSemResponsavelAtivo('p1', new Set(['u1']))
    expect(r.map(c => c.id)).toEqual(['c1', 'c4'])
    const where = db.card.findMany.mock.calls[0][0].where
    expect(where.OR).toEqual([{ projectId: 'p1' }, { sprint: { projectId: 'p1' } }])
  })

  it('sem inativos não consulta cards', async () => {
    expect(await cardsSemResponsavelAtivo('p1', new Set())).toEqual([])
    expect(db.card.findMany).not.toHaveBeenCalled()
  })
})

describe('notificarPendenciasDoMembroInativo', () => {
  beforeEach(() => {
    db.project.findUnique.mockResolvedValue({ name: 'Operum' })
    db.userProject.findMany.mockResolvedValue([{ userId: 'u1' }])
    db.userProjectRole.findMany.mockResolvedValue([{ userId: 'g1' }, { userId: 'g2' }, { userId: 'g1' }])
    db.card.findMany.mockResolvedValue([card('c1', 'A Fazer', ['u1']), card('c2', 'Em teste', ['u1'])])
    db.cardResponsible.findMany.mockResolvedValue([{ cardId: 'c1' }, { cardId: 'c2' }])
  })

  it('avisa cada gerente uma vez, com os cards pendentes e o motivo', async () => {
    const r = await notificarPendenciasDoMembroInativo('p1', { id: 'u1', name: 'Ana' }, 'Saiu da equipe')
    expect(r).toEqual({ gerentes: 2, pendentes: 2 })
    expect(publish).toHaveBeenCalledTimes(2)
    const n = publish.mock.calls[0][0]
    expect(n).toMatchObject({ userId: 'g1', type: 'UPDATE', title: 'Pendência: cards sem responsável ativo', referenceType: 'PROJECT' })
    expect(n.message).toContain('Ana foi inativado no projeto Operum. Motivo: Saiu da equipe.')
    expect(n.message).toContain('"Card c1", "Card c2"')
    expect(n.reference).toBe('/projetos/p1/sprints/s1')
    // O próprio inativado não é notificado como gerente.
    expect(db.userProjectRole.findMany.mock.calls[0][0].where.userId).toEqual({ not: 'u1' })
  })

  it('um único card pendente leva direto a ele', async () => {
    db.card.findMany.mockResolvedValue([card('c1', 'A Fazer', ['u1'])])
    db.cardResponsible.findMany.mockResolvedValue([{ cardId: 'c1' }])
    await notificarPendenciasDoMembroInativo('p1', { id: 'u1', name: 'Ana' }, 'Saiu')
    expect(publish.mock.calls[0][0]).toMatchObject({ reference: '/projetos/p1/sprints/s1?card=c1', referenceType: 'CARD' })
  })

  it('sem pendências, avisa só a inativação; falha ao publicar não estoura', async () => {
    db.card.findMany.mockResolvedValue([])
    publish.mockRejectedValue(new Error('fila fora'))
    const r = await notificarPendenciasDoMembroInativo('p1', { id: 'u1', name: 'Ana' }, 'Saiu')
    expect(r.pendentes).toBe(0)
    expect(publish.mock.calls[0][0]).toMatchObject({ title: 'Membro inativado', reference: '/projetos/p1/stakeholders' })
  })
})

describe('bloqueioDeConclusao', () => {
  it('recusa concluir card só com responsáveis inativos', async () => {
    db.sprintColumn.findUnique.mockResolvedValue({ title: 'Concluído', sprint: { projectId: 'p1' } })
    db.cardResponsible.findMany.mockResolvedValue([{ userId: 'u1' }])
    db.userProject.findMany.mockResolvedValue([{ userId: 'u1' }])
    expect(await bloqueioDeConclusao('c1', 'col')).toMatch(/adicione outro responsável/)
  })

  it('libera com um responsável ativo, ou em coluna que não é de conclusão', async () => {
    db.sprintColumn.findUnique.mockResolvedValue({ title: 'Concluído', sprint: { projectId: 'p1' } })
    db.cardResponsible.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }])
    db.userProject.findMany.mockResolvedValue([{ userId: 'u1' }])
    expect(await bloqueioDeConclusao('c1', 'col')).toBeNull()

    db.sprintColumn.findUnique.mockResolvedValue({ title: 'Em teste', sprint: { projectId: 'p1' } })
    expect(await bloqueioDeConclusao('c1', 'col')).toBeNull()
  })
})
