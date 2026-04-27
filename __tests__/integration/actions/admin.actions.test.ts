// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  adminApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    toggleActive: vi.fn(),
    setRole: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { adminApi } from '@/lib/api-client'
import {
  listUsersAction,
  adminCreateUserAction,
  adminUpdateUserAction,
  toggleUserActiveAction,
  setUserRoleAction,
} from '@/app/actions/admin'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const ADMIN_SESSION = { userId: 'u1', role: 'admin' }
const MEMBER_SESSION = { userId: 'u2', role: 'member' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin guard', () => {
  it('returns unauthorized error when caller role is not admin', async () => {
    mockVerify.mockResolvedValue(MEMBER_SESSION)
    const result = await listUsersAction()
    expect(result).toMatchObject({ error: expect.stringMatching(/acesso|permiss|admin/i) })
    expect(adminApi.listUsers).not.toHaveBeenCalled()
  })

  it('returns unauthorized when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await listUsersAction()
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('listUsersAction', () => {
  it('calls listAllUsers and returns users for admin', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    vi.mocked(adminApi.listUsers).mockResolvedValue([{ id: 'u1', name: 'Alice', email: 'alice@x.com', role: 'member', isActive: true }])
    const result = await listUsersAction()
    expect(adminApi.listUsers).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ users: [{ id: 'u1' }] })
  })
})

describe('toggleUserActiveAction', () => {
  it('calls service with correct userId and active flag', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    vi.mocked(adminApi.toggleActive).mockResolvedValue({ id: 'u2', name: 'Bob', email: 'bob@x.com', role: 'member', isActive: false })
    const result = await toggleUserActiveAction('u2', false)
    expect(adminApi.toggleActive).toHaveBeenCalledWith('u2', false)
    expect(result).toMatchObject({ user: { isActive: false } })
  })
})

describe('setUserRoleAction', () => {
  it('calls setUserRole with userId and role', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    vi.mocked(adminApi.setRole).mockResolvedValue({ id: 'u2', name: 'Bob', email: 'bob@x.com', role: 'admin' })
    const result = await setUserRoleAction('u2', 'admin')
    expect(adminApi.setRole).toHaveBeenCalledWith('u2', 'admin')
    expect(result).toMatchObject({ user: { role: 'admin' } })
  })
})

describe('adminCreateUserAction', () => {
  it('calls adminCreateUser and returns new user', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    vi.mocked(adminApi.createUser).mockResolvedValue({ id: 'u3', name: 'Bob', email: 'bob@test.com', role: 'member' })
    const result = await adminCreateUserAction({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'secret123',
    })
    expect(adminApi.createUser).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ user: { id: 'u3' } })
  })
})

describe('adminUpdateUserAction', () => {
  it('calls adminUpdateUser with userId and data', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    vi.mocked(adminApi.updateUser).mockResolvedValue({ id: 'u1', name: 'Alice Updated', email: 'alice@x.com', role: 'member' })
    const result = await adminUpdateUserAction('u1', { name: 'Alice Updated' })
    expect(adminApi.updateUser).toHaveBeenCalledWith('u1', { name: 'Alice Updated' })
    expect(result).toMatchObject({ user: { id: 'u1' } })
  })
})
