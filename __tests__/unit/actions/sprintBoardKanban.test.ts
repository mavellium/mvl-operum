// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  sprintsApi: {
    get: vi.fn(),
    listColumns: vi.fn(),
  },
  adminApi: {
    listAllUsers: vi.fn(),
  },
  tagsApi: {
    list: vi.fn(),
  },
  cardsApi: {
    update: vi.fn(),
    listBacklog: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    userProject: { findMany: vi.fn() },
  },
}))

import { verifySession } from '@/lib/dal'
import { sprintsApi, adminApi, tagsApi, cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import {
  getSprintBoardAction,
  moveCardInSprintAction,
  moveCardToSprintAction,
  moveCardToBacklogAction,
} from '@/app/actions/sprintBoard'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.userProject.findMany).mockResolvedValue([])
})

// ── Teste 1: Query Híbrida ─────────────────────────────────

describe('getSprintBoardAction — query híbrida', () => {
  it('retorna sprint, colunas da sprint E backlogCards do projeto', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1', projectId: 'proj1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([
      { id: 'col1', title: 'A fazer', position: 0, cards: [] },
    ])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([
      { id: 'card-b1', title: 'Task no Backlog', status: 'Backlog', sprintId: null, projectId: 'proj1' },
    ] as never)

    const result = await getSprintBoardAction('s1', 'proj1')

    expect(result).not.toHaveProperty('error')
    expect(result).toHaveProperty('sprint')
    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('backlogCards')
    expect((result as { backlogCards: unknown[] }).backlogCards).toHaveLength(1)
  })
  it('retorna users somente com os membros (stakeholders) vinculados ao projeto', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1', projectId: 'proj1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([])
    vi.mocked(prisma.userProject.findMany).mockResolvedValue([
      { user: { id: 'm1', name: 'Membro 1', email: 'm1@ex.com', avatarUrl: null } },
      { user: { id: 'm2', name: 'Membro 2', email: 'm2@ex.com', avatarUrl: null } },
    ] as never)

    const result = await getSprintBoardAction('s1', 'proj1') as { users: { id: string; name: string; email: string; avatarUrl: string | null }[] }

    expect(prisma.userProject.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: 'proj1', active: true }),
    }))
    expect(result.users).toHaveLength(2)
    expect(result.users.map(u => u.id)).toEqual(['m1', 'm2'])
  })

  it('chama listBacklog com o projectId correto', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1', projectId: 'proj1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([])

    await getSprintBoardAction('s1', 'proj1')

    expect(cardsApi.listBacklog).toHaveBeenCalledWith('proj1')
  })

  it('retorna error se a busca falhar', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(sprintsApi.get).mockRejectedValue(new Error('Not found'))
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([])

    const result = await getSprintBoardAction('s1', 'proj1')
    expect(result).toHaveProperty('error')
  })
})

// ── Teste 2: moveCardInSprintAction (coluna → coluna) ──────

describe('moveCardInSprintAction — coluna da sprint → coluna da sprint', () => {
  it('chama cardsApi.update com sprintColumnId e sprintPosition', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardInSprintAction('card-1', 'col-a-fazer', 0)

    expect(cardsApi.update).toHaveBeenCalledWith('card-1', {
      sprintColumnId: 'col-a-fazer',
      sprintPosition: 0,
    })
    expect(result).toHaveProperty('success', true)
  })

  it('inclui reason quando fornecido (movimentação retroativa)', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    await moveCardInSprintAction('card-2', 'col-backlog', 1, 'Bug encontrado em produção')

    expect(cardsApi.update).toHaveBeenCalledWith('card-2', {
      sprintColumnId: 'col-backlog',
      sprintPosition: 1,
      reason: 'Bug encontrado em produção',
    })
  })
})

// ── Teste 3: moveCardToSprintAction (Backlog → Sprint) ─────

describe('moveCardToSprintAction — Backlog → coluna da sprint', () => {
  it('atualiza sprintId, sprintColumnId e sprintPosition', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardToSprintAction('card-3', 'sprint-1', 'col-a-fazer', 0)

    expect(cardsApi.update).toHaveBeenCalledWith('card-3', {
      sprintId: 'sprint-1',
      sprintColumnId: 'col-a-fazer',
      sprintPosition: 0,
    })
    expect(result).toHaveProperty('success', true)
  })
})

// ── Teste 4: moveCardToBacklogAction (Sprint → Backlog) ────

describe('moveCardToBacklogAction — coluna da sprint → Backlog', () => {
  it('define sprintId, sprintColumnId e sprintPosition como null', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', tenantId: 'tenant1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardToBacklogAction('card-4')

    expect(cardsApi.update).toHaveBeenCalledWith('card-4', {
      sprintId: null,
      sprintColumnId: null,
      sprintPosition: null,
    })
    expect(result).toHaveProperty('success', true)
  })
})
