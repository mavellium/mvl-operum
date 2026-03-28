// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    cardResponsible: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { addResponsible, removeResponsible, getResponsibles } from '@/services/cardResponsibleService'

const mockPrisma = prisma as {
  cardResponsible: {
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('addResponsible', () => {
  it('creates CardResponsible entry', async () => {
    mockPrisma.cardResponsible.create.mockResolvedValue({ cardId: 'c1', userId: 'u1' })
    const result = await addResponsible('c1', 'u1')
    expect(mockPrisma.cardResponsible.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardId: 'c1', userId: 'u1' } })
    )
    expect(result).toHaveProperty('cardId', 'c1')
  })
})

describe('removeResponsible', () => {
  it('deletes CardResponsible entry', async () => {
    mockPrisma.cardResponsible.delete.mockResolvedValue({ cardId: 'c1', userId: 'u1' })
    await removeResponsible('c1', 'u1')
    expect(mockPrisma.cardResponsible.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cardId_userId: { cardId: 'c1', userId: 'u1' } } })
    )
  })
})

describe('getResponsibles', () => {
  it('returns responsibles with user info', async () => {
    mockPrisma.cardResponsible.findMany.mockResolvedValue([
      { cardId: 'c1', userId: 'u1', user: { id: 'u1', name: 'Ana', cargo: 'Dev', avatarUrl: null } },
    ])
    const result = await getResponsibles('c1')
    expect(result).toHaveLength(1)
    expect(result[0].user.name).toBe('Ana')
  })
})
