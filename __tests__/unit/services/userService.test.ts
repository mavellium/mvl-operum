// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
} from '@/services/userService'

const mockPrisma = prisma as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}
const mockBcrypt = bcrypt as unknown as {
  compare: ReturnType<typeof vi.fn>
  hash: ReturnType<typeof vi.fn>
}

const mockUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@x.com',
  passwordHash: 'hash123',
  role: 'member',
  avatarUrl: null,
  cargo: null,
  departamento: null,
  hourlyRate: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('getUserProfile', () => {
  it('returns user without passwordHash', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...userWithoutHash } = mockUser
    mockPrisma.user.findUnique.mockResolvedValue(userWithoutHash)
    const result = await getUserProfile('u1')
    expect(result).not.toHaveProperty('passwordHash')
    expect(result?.name).toBe('Ana')
  })

  it('returns null if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await getUserProfile('u1')
    expect(result).toBeNull()
  })
})

describe('updateUserProfile', () => {
  it('validates and updates profile fields', async () => {
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'Nova Ana', hourlyRate: 80 })
    const result = await updateUserProfile('u1', { name: 'Nova Ana', email: 'ana@x.com', hourlyRate: 80 })
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } })
    )
    expect(result.name).toBe('Nova Ana')
  })

  it('throws if validation fails (name too short)', async () => {
    await expect(updateUserProfile('u1', { name: 'A', email: 'a@b.com', hourlyRate: 0 })).rejects.toThrow()
  })
})

describe('changePassword', () => {
  it('throws if current password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(false)
    await expect(
      changePassword('u1', { senhaAtual: 'wrong', novaSenha: 'NewPass1!', confirmacao: 'NewPass1!' })
    ).rejects.toThrow(/incorreta/)
  })

  it('updates passwordHash when current password is correct', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true)
    mockBcrypt.hash.mockResolvedValue('newhash')
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'newhash' })
    await changePassword('u1', { senhaAtual: 'OldPass1!', novaSenha: 'NewPass1!', confirmacao: 'NewPass1!' })
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'newhash' }) })
    )
  })

  it('throws if new password validation fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true)
    await expect(
      changePassword('u1', { senhaAtual: 'OldPass1!', novaSenha: 'short', confirmacao: 'short' })
    ).rejects.toThrow()
  })

  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(
      changePassword('u1', { senhaAtual: 'OldPass1!', novaSenha: 'NewPass1!', confirmacao: 'NewPass1!' })
    ).rejects.toThrow()
  })
})
