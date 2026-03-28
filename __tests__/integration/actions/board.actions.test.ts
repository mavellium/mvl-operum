// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    card: { update: vi.fn() },
  }
  return { default: mockPrisma, prisma: mockPrisma }
})

vi.mock('@/services/sprintService', () => ({
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
  deleteSprint: vi.fn(),
  assignCardToSprint: vi.fn(),
  completeSprint: vi.fn(),
  getSprintsForBoard: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { getSprintsForBoard } from '@/services/sprintService'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>
const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCardUpdate = prisma.card.update as ReturnType<typeof vi.fn>
const mockGetSprintsForBoard = getSprintsForBoard as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifySession.mockResolvedValue({ userId: 'u1', role: 'member' })
})

describe('getUsersAction', () => {
  it('returns users without passwordHash', async () => {
    const { getUsersAction } = await import('@/app/actions/users')
    const users = [{ id: 'u1', name: 'Ana', email: 'ana@x.com' }]
    mockUserFindMany.mockResolvedValue(users)

    const result = await getUsersAction()
    expect(result).toEqual(users)
    expect(mockUserFindMany).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true },
    })
  })

  it('calls verifySession before querying', async () => {
    const { getUsersAction } = await import('@/app/actions/users')
    mockUserFindMany.mockResolvedValue([])

    await getUsersAction()
    expect(mockVerifySession).toHaveBeenCalled()
  })
})

describe('getCurrentUserAction', () => {
  it('returns current user based on session userId', async () => {
    const { getCurrentUserAction } = await import('@/app/actions/users')
    const user = { id: 'u1', name: 'Ana', email: 'ana@x.com' }
    mockUserFindUnique.mockResolvedValue(user)

    const result = await getCurrentUserAction()
    expect(result).toEqual(user)
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })
  })
})

describe('getSprintsForBoardAction', () => {
  it('delegates to getSprintsForBoard service', async () => {
    const { getSprintsForBoardAction } = await import('@/app/actions/sprints')
    const sprints = [{ id: 's1', name: 'Sprint 1', boardId: 'b1', status: 'PLANNED' }]
    mockGetSprintsForBoard.mockResolvedValue(sprints)

    const result = await getSprintsForBoardAction('b1')
    expect(result).toEqual(sprints)
    expect(mockGetSprintsForBoard).toHaveBeenCalledWith('b1')
  })

  it('calls verifySession before fetching', async () => {
    const { getSprintsForBoardAction } = await import('@/app/actions/sprints')
    mockGetSprintsForBoard.mockResolvedValue([])

    await getSprintsForBoardAction('b1')
    expect(mockVerifySession).toHaveBeenCalled()
  })
})

describe('updateCardAction extended', () => {
  it('accepts sprintId in payload', async () => {
    const { updateCardAction } = await import('@/app/actions')
    mockCardUpdate.mockResolvedValue({})

    await updateCardAction('card1', {
      title: 'T',
      description: 'D',
      responsible: 'Ana',
      color: '#3b82f6',
      sprintId: 's1',
    })
    expect(mockCardUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card1' },
        data: expect.objectContaining({ sprintId: 's1' }),
      }),
    )
  })

  it('accepts responsibleId in payload', async () => {
    const { updateCardAction } = await import('@/app/actions')
    mockCardUpdate.mockResolvedValue({})

    await updateCardAction('card1', {
      title: 'T',
      description: 'D',
      responsible: 'Ana',
      color: '#3b82f6',
      responsibleId: 'u1',
    })
    expect(mockCardUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsibleId: 'u1' }),
      }),
    )
  })
})
