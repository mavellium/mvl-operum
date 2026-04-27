// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  sprintsApi: {
    get: vi.fn(),
    listColumns: vi.fn(),
    createColumn: vi.fn(),
  },
  adminApi: {
    listAllUsers: vi.fn(),
  },
  tagsApi: {
    list: vi.fn(),
  },
  cardsApi: {
    update: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { sprintsApi, adminApi, tagsApi, cardsApi } from '@/lib/api-client'
import {
  getSprintBoardAction,
  addSprintColumnAction,
  moveCardInSprintAction,
} from '@/app/actions/sprintBoard'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('getSprintBoardAction', () => {
  it('returns sprint, columns, users, tags', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.get).mockResolvedValue({ id: 's1', name: 'Sprint 1' } as never)
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([{ id: 'sc1', title: 'A Fazer', position: 0 }])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])

    const result = await getSprintBoardAction('s1')
    expect(result).toHaveProperty('sprint')
    expect(result).toHaveProperty('columns')
  })

  it('returns error if sprint fetch fails', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.get).mockRejectedValue(new Error('Not found'))
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])
    vi.mocked(tagsApi.list).mockResolvedValue([])

    const result = await getSprintBoardAction('s1')
    expect(result).toHaveProperty('error')
  })
})

describe('addSprintColumnAction', () => {
  it('creates a column for the sprint', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(sprintsApi.listColumns).mockResolvedValue([])
    vi.mocked(sprintsApi.createColumn).mockResolvedValue({ id: 'sc1', title: 'Nova Col', position: 0 })

    const result = await addSprintColumnAction('s1', 'Nova Col')
    expect(result).toHaveProperty('column')
    expect(sprintsApi.createColumn).toHaveBeenCalledWith('s1', { title: 'Nova Col', position: 0 })
  })
})

describe('moveCardInSprintAction', () => {
  it('calls cardsApi.update with new column and position', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.update).mockResolvedValue(undefined)

    const result = await moveCardInSprintAction('c1', 'sc2', 2)
    expect(cardsApi.update).toHaveBeenCalledWith('c1', { sprintColumnId: 'sc2', sprintPosition: 2 })
    expect(result).toHaveProperty('success', true)
  })
})
