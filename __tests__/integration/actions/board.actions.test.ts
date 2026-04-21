// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  adminApi: {
    listAllUsers: vi.fn(),
  },
  authApi: {
    me: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { adminApi, authApi } from '@/lib/api-client'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifySession.mockResolvedValue({ userId: 'u1', role: 'member' })
})

describe('getUsersAction', () => {
  it('returns users without passwordHash', async () => {
    const { getUsersAction } = await import('@/app/actions/users')
    const users = [{ id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member', isActive: true }]
    vi.mocked(adminApi.listAllUsers).mockResolvedValue(users)

    const result = await getUsersAction()
    expect(result).toEqual(users)
    expect(adminApi.listAllUsers).toHaveBeenCalledOnce()
  })

  it('calls verifySession before querying', async () => {
    const { getUsersAction } = await import('@/app/actions/users')
    vi.mocked(adminApi.listAllUsers).mockResolvedValue([])

    await getUsersAction()
    expect(mockVerifySession).toHaveBeenCalled()
  })
})

describe('getCurrentUserAction', () => {
  it('returns current user based on session userId', async () => {
    const { getCurrentUserAction } = await import('@/app/actions/users')
    const user = { id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member', avatarUrl: null, isActive: true, forcePasswordChange: false }
    vi.mocked(authApi.me).mockResolvedValue(user)

    const result = await getCurrentUserAction()
    expect(result).toMatchObject({ id: 'u1', name: 'Ana' })
    expect(authApi.me).toHaveBeenCalledOnce()
  })
})
