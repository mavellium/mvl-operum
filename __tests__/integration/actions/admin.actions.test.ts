// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/services/adminService', () => ({
  listAllUsers: vi.fn(),
  adminCreateUser: vi.fn(),
  adminUpdateUser: vi.fn(),
  toggleUserActive: vi.fn(),
  setUserRole: vi.fn(),
}))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import {
  listUsersAction,
  adminCreateUserAction,
  adminUpdateUserAction,
  toggleUserActiveAction,
  setUserRoleAction,
} from '@/app/actions/admin'
import {
  listAllUsers,
  adminCreateUser,
  adminUpdateUser,
  toggleUserActive,
  setUserRole,
} from '@/services/adminService'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockList = listAllUsers as ReturnType<typeof vi.fn>
const mockCreate = adminCreateUser as ReturnType<typeof vi.fn>
const mockUpdate = adminUpdateUser as ReturnType<typeof vi.fn>
const mockToggle = toggleUserActive as ReturnType<typeof vi.fn>
const mockSetRole = setUserRole as ReturnType<typeof vi.fn>

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
    expect(mockList).not.toHaveBeenCalled()
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
    mockList.mockResolvedValue([{ id: 'u1', name: 'Alice' }])
    const result = await listUsersAction()
    expect(mockList).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ users: [{ id: 'u1' }] })
  })
})

describe('toggleUserActiveAction', () => {
  it('calls service with correct userId and active flag', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    mockToggle.mockResolvedValue({ id: 'u2', isActive: false })
    const result = await toggleUserActiveAction('u2', false)
    expect(mockToggle).toHaveBeenCalledWith('u2', false)
    expect(result).toMatchObject({ user: { isActive: false } })
  })
})

describe('setUserRoleAction', () => {
  it('calls setUserRole with userId and role', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    mockSetRole.mockResolvedValue({ id: 'u2', role: 'admin' })
    const result = await setUserRoleAction('u2', 'admin')
    expect(mockSetRole).toHaveBeenCalledWith('u2', 'admin')
    expect(result).toMatchObject({ user: { role: 'admin' } })
  })
})

describe('adminCreateUserAction', () => {
  it('calls adminCreateUser and returns new user', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    mockCreate.mockResolvedValue({ id: 'u3', name: 'Bob', email: 'bob@test.com' })
    const result = await adminCreateUserAction({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'secret123',
    })
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ user: { id: 'u3' } })
  })
})

describe('adminUpdateUserAction', () => {
  it('calls adminUpdateUser with userId and data', async () => {
    mockVerify.mockResolvedValue(ADMIN_SESSION)
    mockUpdate.mockResolvedValue({ id: 'u1', name: 'Alice Updated' })
    const result = await adminUpdateUserAction('u1', { name: 'Alice Updated' })
    expect(mockUpdate).toHaveBeenCalledWith('u1', { name: 'Alice Updated' })
    expect(result).toMatchObject({ user: { id: 'u1' } })
  })
})
