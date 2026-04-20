// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/services/sprintColumnService', () => ({
  getSprintColumns: vi.fn(),
  createSprintColumn: vi.fn(),
  initSprintColumns: vi.fn(),
  moveCardInSprint: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    sprint: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}))

import { verifySession } from '@/lib/dal'
import { getSprintColumns, createSprintColumn, moveCardInSprint } from '@/services/sprintColumnService'
import prisma from '@/lib/prisma'
import {
  getSprintBoardAction,
  addSprintColumnAction,
  moveCardInSprintAction,
} from '@/app/actions/sprintBoard'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockGetCols = getSprintColumns as ReturnType<typeof vi.fn>
const mockCreateCol = createSprintColumn as ReturnType<typeof vi.fn>
const mockMoveCard = moveCardInSprint as ReturnType<typeof vi.fn>
const mockPrisma = prisma as {
  sprint: { findUnique: ReturnType<typeof vi.fn> }
  user: { findMany: ReturnType<typeof vi.fn> }
  tag: { findMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.clearAllMocks())

describe('getSprintBoardAction', () => {
  it('returns sprint, columns, users, tags', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockPrisma.sprint.findUnique.mockResolvedValue({ id: 's1', name: 'Sprint 1', boardId: 'b1' })
    mockGetCols.mockResolvedValue([{ id: 'sc1', title: 'A Fazer', cards: [] }])
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.tag.findMany.mockResolvedValue([])
    const result = await getSprintBoardAction('s1')
    expect(result).toHaveProperty('sprint')
    expect(result).toHaveProperty('columns')
  })

  it('returns error if sprint not found', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockPrisma.sprint.findUnique.mockResolvedValue(null)
    const result = await getSprintBoardAction('s1')
    expect(result).toHaveProperty('error')
  })
})

describe('addSprintColumnAction', () => {
  it('creates a column for the sprint', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockGetCols.mockResolvedValue([])
    mockCreateCol.mockResolvedValue({ id: 'sc1', title: 'Nova Col', position: 0 })
    const result = await addSprintColumnAction('s1', 'Nova Col')
    expect(result).toHaveProperty('column')
    expect(mockCreateCol).toHaveBeenCalledWith('s1', 'Nova Col', 0)
  })
})

describe('moveCardInSprintAction', () => {
  it('calls moveCardInSprint service', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockMoveCard.mockResolvedValue({ id: 'c1' })
    const result = await moveCardInSprintAction('c1', 'sc2', 2)
    expect(mockMoveCard).toHaveBeenCalledWith('c1', 'sc2', 2)
    expect(result).toHaveProperty('success', true)
  })
})
