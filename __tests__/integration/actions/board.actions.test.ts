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

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>
const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>

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
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ id: true, name: true, email: true }),
      }),
    )
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
