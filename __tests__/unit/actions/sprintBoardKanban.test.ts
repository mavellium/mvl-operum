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

import { verifySession } from '@/lib/dal'
import { sprintsApi, adminApi, tagsApi, cardsApi } from '@/lib/api-client'
import {
  getSprintBoardAction,
  moveCardInSprintAction,
} from '@/app/actions/sprintBoard'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

// ── Teste 1: Query Híbrida ─────────────────────────────────

describe('getSprintBoardAction — query híbrida', () => {
  it('retorna sprint, colunas da sprint E backlogCards do projeto', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1', projectId: 'proj1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([
      { id: 'col1', title: 'A fazer', position: 0, cards: [] },
    ])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([
      { id: 'card-b1', title: 'Task no Backlog', status: 'Backlog', sprintId: null, projectId: 'proj1' },
    ])

    const result = await getSprintBoardAction('s1', 'proj1')

    expect(result).not.toHaveProperty('error')
    expect(result).toHaveProperty('sprint')
    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('backlogCards')
    expect((result as { backlogCards: unknown[] }).backlogCards).toHaveLength(1)
  })

  it('chama listBacklog com o projectId correto', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1', projectId: 'proj1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([])

    await getSprintBoardAction('s1', 'proj1')

    expect(cardsApi.listBacklog).toHaveBeenCalledWith('proj1')
  })

  it('retorna error se a busca falhar', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.get).mockRejectedValue(new Error('Not found'))
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])
    vi.mocked(cardsApi.listBacklog).mockResolvedValue([])

    const result = await getSprintBoardAction('s1', 'proj1')
    expect(result).toHaveProperty('error')
  })
})

// ── Teste 2: Mutação de Entrada (Backlog → Sprint) ─────────

describe('moveCardInSprintAction — Backlog → coluna da sprint', () => {
  it('atualiza sprintId E status quando destino não é BACKLOG', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardInSprintAction('card-1', 'col-a-fazer', 0, {
      isBacklog: false,
      currentSprintId: 'sprint-1',
      destStatus: 'A fazer',
    })

    expect(cardsApi.update).toHaveBeenCalledWith('card-1', {
      sprintColumnId: 'col-a-fazer',
      sprintPosition: 0,
      sprintId: 'sprint-1',
      status: 'A fazer',
    })
    expect(result).toHaveProperty('success', true)
  })

  it('atualiza status corretamente para "Em andamento"', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    await moveCardInSprintAction('card-2', 'col-em-andamento', 1, {
      isBacklog: false,
      currentSprintId: 'sprint-1',
      destStatus: 'Em andamento',
    })

    expect(cardsApi.update).toHaveBeenCalledWith('card-2', expect.objectContaining({
      sprintId: 'sprint-1',
      status: 'Em andamento',
    }))
  })
})

// ── Teste 3: Mutação de Saída (Sprint → Backlog) ───────────

describe('moveCardInSprintAction — coluna da sprint → Backlog', () => {
  it('define sprintId como null e status como Backlog quando destino é BACKLOG', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardInSprintAction('card-3', 'BACKLOG', 0, {
      isBacklog: true,
      currentSprintId: 'sprint-1',
      destStatus: 'Backlog',
      projectId: 'proj-1',
    })

    expect(cardsApi.update).toHaveBeenCalledWith('card-3', {
      sprintColumnId: null,
      sprintPosition: 0,
      sprintId: null,
      status: 'Backlog',
      projectId: 'proj-1',
    })
    expect(result).toHaveProperty('success', true)
  })

  it('não passa o currentSprintId quando o destino é BACKLOG', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    await moveCardInSprintAction('card-4', 'BACKLOG', 2, {
      isBacklog: true,
      currentSprintId: 'sprint-99',
      destStatus: 'Backlog',
    })

    const callArg = vi.mocked(cardsApi.update).mock.calls[0][1]
    expect(callArg).toHaveProperty('sprintId', null)
    expect(callArg).not.toHaveProperty('sprintId', 'sprint-99')
  })
})
