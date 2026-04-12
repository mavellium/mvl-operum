// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashedpw'),
  },
}))

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const mockPrisma = prisma as {
  user: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const BASE_USER = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.com',
  passwordHash: 'hash',
  role: 'member',
  isActive: true,
  avatarUrl: null,
  cargo: null,
  departamento: null,
  hourlyRate: 0,
  tokenVersion: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listAllUsers', () => {
  it('returns all users with isActive and role fields', async () => {
    const { listAllUsers } = await import('@/services/adminService')
    mockPrisma.user.findMany.mockResolvedValue([BASE_USER])
    const users = await listAllUsers()
    expect(mockPrisma.user.findMany).toHaveBeenCalledOnce()
    expect(users[0]).toMatchObject({ isActive: true, role: 'member' })
  })
})

describe('adminCreateUser', () => {
  it('hashes password, sets role member and isActive true by default', async () => {
    const { adminCreateUser } = await import('@/services/adminService')
    mockPrisma.user.create.mockResolvedValue({ ...BASE_USER, id: 'u2' })
    const result = await adminCreateUser({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'secret123',
    })
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10)
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashedpw',
          role: 'member',
          isActive: true,
        }),
      }),
    )
    expect(result).toBeDefined()
  })
})

describe('adminUpdateUser', () => {
  it('updates name email cargo departamento hourlyRate', async () => {
    const { adminUpdateUser } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER)
    mockPrisma.user.update.mockResolvedValue({ ...BASE_USER, name: 'Alice Updated' })
    const result = await adminUpdateUser('u1', { name: 'Alice Updated', cargo: 'Dev' })
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    )
    expect(result.name).toBe('Alice Updated')
  })

  it('throws if user not found', async () => {
    const { adminUpdateUser } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(adminUpdateUser('bad', {})).rejects.toThrow()
  })
})

describe('toggleUserActive', () => {
  it('sets isActive false and increments tokenVersion when deactivating', async () => {
    const { toggleUserActive } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue({ ...BASE_USER, tokenVersion: 2 })
    mockPrisma.user.update.mockResolvedValue({ ...BASE_USER, isActive: false, tokenVersion: 3 })
    const result = await toggleUserActive('u1', false)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { isActive: false, tokenVersion: 3 },
      }),
    )
    expect(result.isActive).toBe(false)
  })

  it('sets isActive true without changing tokenVersion when activating', async () => {
    const { toggleUserActive } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue({ ...BASE_USER, isActive: false, tokenVersion: 5 })
    mockPrisma.user.update.mockResolvedValue({ ...BASE_USER, isActive: true, tokenVersion: 5 })
    await toggleUserActive('u1', true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { isActive: true },
      }),
    )
  })

  it('throws if user not found', async () => {
    const { toggleUserActive } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(toggleUserActive('bad', false)).rejects.toThrow()
  })
})

describe('setUserRole', () => {
  it('updates role field', async () => {
    const { setUserRole } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER)
    mockPrisma.user.update.mockResolvedValue({ ...BASE_USER, role: 'admin' })
    const result = await setUserRole('u1', 'admin')
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { role: 'admin' },
      }),
    )
    expect(result.role).toBe('admin')
  })

  it('throws if user not found', async () => {
    const { setUserRole } = await import('@/services/adminService')
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(setUserRole('bad', 'admin')).rejects.toThrow()
  })
})
