// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { register, login } from '@/services/authService'

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('register', () => {
  it('throws ValidationError on invalid schema (bad email)', async () => {
    await expect(register({ name: 'Ana', email: 'not-an-email', password: 'Test@1234', tenantId: 't1' })).rejects.toThrow()
  })

  it('throws ConflictError when email already exists within same tenant', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' })
    await expect(register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })).rejects.toThrow(/já cadastrado/i)
  })

  it('creates user with tenantId', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'u1',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'member',
        tenantId: data.tenantId,
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    )
    const user = await register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })
    expect(mockPrisma.user.create.mock.calls[0][0].data.tenantId).toBe('t1')
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('hashes password (stored hash is not equal to plaintext)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.create.mockImplementation(({ data }: { data: { passwordHash: string } }) =>
      Promise.resolve({
        id: 'u1',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'member',
        tenantId: 't1',
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    )
    await register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })
    const createCall = mockPrisma.user.create.mock.calls[0][0]
    expect(createCall.data.passwordHash).not.toBe('Test@1234')
    expect(typeof createCall.data.passwordHash).toBe('string')
    expect(createCall.data.passwordHash.length).toBeGreaterThan(10)
  })

  it('returns user without passwordHash', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'member',
      tenantId: 't1',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const user = await register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).toMatchObject({ name: 'Ana', email: 'ana@example.com' })
  })
})

describe('login', () => {
  it('throws AuthError when user not found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)
    await expect(login({ email: 'missing@example.com', password: 'Test@1234', tenantId: 't1' })).rejects.toThrow(/credenciais/i)
  })

  it('throws AuthError when password does not match', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      passwordHash: '$2a$10$wronghash',
      tenantId: 't1',
      status: 'active',
      isActive: true,
      loginAttempts: 0,
    })
    await expect(login({ email: 'ana@example.com', password: 'wrongpassword', tenantId: 't1' })).rejects.toThrow(/credenciais/i)
  })

  it('returns userId, role, tenantId and tokenVersion on valid credentials', async () => {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('Test@1234', 10)
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      role: 'member',
      tenantId: 't1',
      passwordHash: hash,
      status: 'active',
      isActive: true,
      tokenVersion: 5,
      loginAttempts: 0,
    })
    mockPrisma.user.update.mockResolvedValue({})
    const result = await login({ email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })
    expect(result).toMatchObject({ userId: 'u1', role: 'member', tenantId: 't1', tokenVersion: 5 })
    expect(result).not.toHaveProperty('passwordHash')
  })

  it('rejects user with status inactive', async () => {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('Test@1234', 10)
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      role: 'member',
      tenantId: 't1',
      passwordHash: hash,
      status: 'inactive',
      isActive: false,
      tokenVersion: 0,
      loginAttempts: 0,
    })
    await expect(login({ email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })).rejects.toThrow(/inativ|bloqueado|credenciais/i)
  })

  it('increments loginAttempts on failed password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      passwordHash: '$2a$10$wronghash',
      tenantId: 't1',
      status: 'active',
      isActive: true,
      loginAttempts: 2,
      tokenVersion: 0,
    })
    mockPrisma.user.update.mockResolvedValue({})

    await expect(login({ email: 'ana@example.com', password: 'wrongpassword', tenantId: 't1' })).rejects.toThrow(/credenciais/i)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ loginAttempts: 3 }),
      }),
    )
  })

  it('sets lastLogin on successful login', async () => {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('Test@1234', 10)
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      role: 'member',
      tenantId: 't1',
      passwordHash: hash,
      status: 'active',
      isActive: true,
      tokenVersion: 0,
      loginAttempts: 0,
    })
    mockPrisma.user.update.mockResolvedValue({})

    await login({ email: 'ana@example.com', password: 'Test@1234', tenantId: 't1' })
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          lastLogin: expect.any(Date),
          loginAttempts: 0,
        }),
      }),
    )
  })
})
