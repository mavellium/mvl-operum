// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    tag: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    cardTag: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { createTag, assignTagToCard, removeTagFromCard, getTagsForBoard } from '@/services/tagService'

const mockPrisma = prisma as {
  tag: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  cardTag: {
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  card: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTag', () => {
  it('throws ValidationError on empty name', async () => {
    await expect(createTag({ name: '', color: '#ef4444', userId: 'u1', boardId: 'b1' })).rejects.toThrow()
  })

  it('creates tag record and returns it', async () => {
    mockPrisma.tag.create.mockResolvedValue({ id: 't1', name: 'bug', color: '#ef4444', userId: 'u1', boardId: 'b1' })
    const tag = await createTag({ name: 'bug', color: '#ef4444', userId: 'u1', boardId: 'b1' })
    expect(mockPrisma.tag.create).toHaveBeenCalledOnce()
    expect(tag.name).toBe('bug')
  })
})

describe('assignTagToCard', () => {
  it('creates CardTag join record', async () => {
    mockPrisma.card.findUnique.mockResolvedValue({ id: 'c1', column: { boardId: 'b1' } })
    mockPrisma.tag.findMany.mockResolvedValue([{ id: 't1', boardId: 'b1' }])
    mockPrisma.cardTag.create.mockResolvedValue({ cardId: 'c1', tagId: 't1' })
    await assignTagToCard('c1', 't1')
    expect(mockPrisma.cardTag.create).toHaveBeenCalledWith({ data: { cardId: 'c1', tagId: 't1' } })
  })
})

describe('removeTagFromCard', () => {
  it('deletes the CardTag record', async () => {
    mockPrisma.cardTag.delete.mockResolvedValue({ cardId: 'c1', tagId: 't1' })
    await removeTagFromCard('c1', 't1')
    expect(mockPrisma.cardTag.delete).toHaveBeenCalledWith({
      where: { cardId_tagId: { cardId: 'c1', tagId: 't1' } },
    })
  })
})

describe('getTagsForBoard', () => {
  it('returns all tags for a boardId', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 't1', name: 'bug', boardId: 'b1' },
      { id: 't2', name: 'feature', boardId: 'b1' },
    ])
    const tags = await getTagsForBoard('b1')
    expect(tags).toHaveLength(2)
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({ where: { boardId: 'b1' } })
  })
})
