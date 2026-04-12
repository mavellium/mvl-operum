// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { create, findAllByCard, findById, update, deleteComentario, addReacao } from '@/services/comentarioService'

const mockPrisma = prisma as {
  comment: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ComentarioService', () => {
  describe('create', () => {
    it('should create comment with default type COMMENT', async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: 'co1',
        cardId: 'card-1',
        userId: 'user-1',
        content: 'Test comment',
        type: 'COMMENT',
        reactions: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const comentario = await create({
        cardId: 'card-1',
        userId: 'user-1',
        content: 'Test comment',
      })
      expect(comentario.content).toBe('Test comment')
      expect(comentario.type).toBe('COMMENT')
    })

    it('should create FEEDBACK type', async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: 'co1',
        cardId: 'card-1',
        userId: 'user-1',
        content: 'Test feedback',
        type: 'FEEDBACK',
        reactions: null,
        deletedAt: null,
      })

      const comentario = await create({
        cardId: 'card-1',
        userId: 'user-1',
        content: 'Test feedback',
        type: 'FEEDBACK',
      })
      expect(comentario.type).toBe('FEEDBACK')
    })

    it('should reject empty content', async () => {
      await expect(
        create({ cardId: 'card-1', userId: 'user-1', content: '' }),
      ).rejects.toThrow()
    })

    it('should reject missing cardId', async () => {
      await expect(
        create({ cardId: '', userId: 'user-1', content: 'Comment' }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByCard', () => {
    it('should return comments for given card', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: 'co1', cardId: 'card-1', content: 'Comment 1' },
        { id: 'co2', cardId: 'card-1', content: 'Comment 2' },
      ])

      const comentarios = await findAllByCard('card-1')
      expect(comentarios).toHaveLength(2)
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cardId: 'card-1', deletedAt: null }),
        }),
      )
    })

    it('should filter out deleted comments', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])

      await findAllByCard('card-1')
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should order by createdAt ascending', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])

      await findAllByCard('card-1')
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return comment by id', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'co1',
        content: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        deletedAt: null,
      })

      const comentario = await findById('co1')
      expect(comentario?.id).toBe('co1')
      expect(comentario?.content).toBe('Comment')
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      const comentario = await findById('nonexistent')
      expect(comentario).toBeNull()
    })

    it('should filter deleted comments', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      await findById('co-deleted')
      expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('update', () => {
    it('should update comment content', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'co1',
        content: 'Old',
        deletedAt: null,
      })
      mockPrisma.comment.update.mockResolvedValue({
        id: 'co1',
        content: 'Updated',
      })

      const comentario = await update('co1', { content: 'Updated' })
      expect(comentario.content).toBe('Updated')
    })

    it('should throw if comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      await expect(
        update('nonexistent', { content: 'Updated' }),
      ).rejects.toThrow(/not found/i)
    })

    it('should reject invalid type', async () => {
      await expect(
        update('co1', { type: 'INVALID' as 'COMMENT' }),
      ).rejects.toThrow()
    })
  })

  describe('deleteComentario', () => {
    it('should soft delete comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'co1',
        deletedAt: null,
      })
      mockPrisma.comment.update.mockResolvedValue({
        id: 'co1',
        deletedAt: expect.any(Date),
      })

      await deleteComentario('co1')
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'co1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should throw if comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      await expect(deleteComentario('nonexistent')).rejects.toThrow(/not found/i)
    })
  })

  describe('addReacao', () => {
    it('should add reaction to comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'co1',
        reactions: { thumbsUp: 1 },
        deletedAt: null,
      })
      mockPrisma.comment.update.mockResolvedValue({
        id: 'co1',
        reactions: { thumbsUp: 2 },
      })

      const comentario = await addReacao('co1', 'thumbsUp')
      expect(comentario.reactions).toBeDefined()
    })

    it('should throw if comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      await expect(addReacao('nonexistent', 'thumbsUp')).rejects.toThrow(/not found/i)
    })
  })
})
