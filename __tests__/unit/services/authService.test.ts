// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { register, login } from '@/services/authService'

const mockPrisma = prisma as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('register', () => {
  it('throws ValidationError on invalid schema (bad email)', async () => {
    await expect(register({ name: 'Ana', email: 'not-an-email', password: 'Test@1234' })).rejects.toThrow()
  })

  it('throws ConflictError when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })
    await expect(register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234' })).rejects.toThrow(/já cadastrado/i)
  })

  it('hashes password (stored hash is not equal to plaintext)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockImplementation(({ data }: { data: { passwordHash: string } }) =>
      Promise.resolve({ id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'member', passwordHash: data.passwordHash, createdAt: new Date(), updatedAt: new Date() }),
    )
    await register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234' })
    const createCall = mockPrisma.user.create.mock.calls[0][0]
    expect(createCall.data.passwordHash).not.toBe('Test@1234')
    expect(typeof createCall.data.passwordHash).toBe('string')
    expect(createCall.data.passwordHash.length).toBeGreaterThan(10)
  })

  it('returns user without passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'member',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const user = await register({ name: 'Ana', email: 'ana@example.com', password: 'Test@1234' })
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).toMatchObject({ name: 'Ana', email: 'ana@example.com' })
  })
})

describe('login', () => {
  it('throws AuthError when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(login({ email: 'missing@example.com', password: 'Test@1234' })).rejects.toThrow(/credenciais/i)
  })

  it('throws AuthError when password does not match', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: '$2a$10$wronghash',
    })
    await expect(login({ email: 'ana@example.com', password: 'wrongpassword' })).rejects.toThrow(/credenciais/i)
  })

  it('returns userId and role on valid credentials', async () => {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('Test@1234', 10)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      role: 'member',
      passwordHash: hash,
    })
    const result = await login({ email: 'ana@example.com', password: 'Test@1234' })
    expect(result).toMatchObject({ userId: 'u1', role: 'member' })
    expect(result).not.toHaveProperty('passwordHash')
  })
})
