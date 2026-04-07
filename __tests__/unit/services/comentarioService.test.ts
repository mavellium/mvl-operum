// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    comentario: {
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
  comentario: {
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
    it('should create comentario with default tipo COMENTARIO', async () => {
      mockPrisma.comentario.create.mockResolvedValue({
        id: 'co1',
        cardId: 'card-1',
        userId: 'user-1',
        texto: 'Test comment',
        tipo: 'COMENTARIO',
        reacoes: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const comentario = await create({
        cardId: 'card-1',
        userId: 'user-1',
        texto: 'Test comment',
      })
      expect(comentario.texto).toBe('Test comment')
      expect(comentario.tipo).toBe('COMENTARIO')
    })

    it('should create feedback tipo', async () => {
      mockPrisma.comentario.create.mockResolvedValue({
        id: 'co1',
        cardId: 'card-1',
        userId: 'user-1',
        texto: 'Test feedback',
        tipo: 'FEEDBACK',
        reacoes: null,
        deletedAt: null,
      })

      const comentario = await create({
        cardId: 'card-1',
        userId: 'user-1',
        texto: 'Test feedback',
        tipo: 'FEEDBACK',
      })
      expect(comentario.tipo).toBe('FEEDBACK')
    })

    it('should reject empty texto', async () => {
      await expect(
        create({ cardId: 'card-1', userId: 'user-1', texto: '' }),
      ).rejects.toThrow()
    })

    it('should reject missing cardId', async () => {
      await expect(
        create({ cardId: '', userId: 'user-1', texto: 'Comment' }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByCard', () => {
    it('should return comentarios for given card', async () => {
      mockPrisma.comentario.findMany.mockResolvedValue([
        { id: 'co1', cardId: 'card-1', texto: 'Comment 1' },
        { id: 'co2', cardId: 'card-1', texto: 'Comment 2' },
      ])

      const comentarios = await findAllByCard('card-1')
      expect(comentarios).toHaveLength(2)
      expect(mockPrisma.comentario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cardId: 'card-1', deletedAt: null }),
        }),
      )
    })

    it('should filter out deleted comentarios', async () => {
      mockPrisma.comentario.findMany.mockResolvedValue([])

      await findAllByCard('card-1')
      expect(mockPrisma.comentario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should order by createdAt ascending', async () => {
      mockPrisma.comentario.findMany.mockResolvedValue([])

      await findAllByCard('card-1')
      expect(mockPrisma.comentario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return comentario by id', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue({
        id: 'co1',
        texto: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        deletedAt: null,
      })

      const comentario = await findById('co1')
      expect(comentario?.id).toBe('co1')
      expect(comentario?.texto).toBe('Comment')
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue(null)

      const comentario = await findById('nonexistent')
      expect(comentario).toBeNull()
    })

    it('should filter deleted comentarios', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue(null)

      await findById('co-deleted')
      expect(mockPrisma.comentario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('update', () => {
    it('should update comentario texto', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue({
        id: 'co1',
        texto: 'Old',
        deletedAt: null,
      })
      mockPrisma.comentario.update.mockResolvedValue({
        id: 'co1',
        texto: 'Updated',
      })

      const comentario = await update('co1', { texto: 'Updated' })
      expect(comentario.texto).toBe('Updated')
    })

    it('should throw if comentario not found', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue(null)

      await expect(
        update('nonexistent', { texto: 'Updated' }),
      ).rejects.toThrow(/não encontrado/i)
    })

    it('should reject invalid tipo', async () => {
      await expect(
        update('co1', { tipo: 'INVALID' as 'COMENTARIO' }),
      ).rejects.toThrow()
    })
  })

  describe('deleteComentario', () => {
    it('should soft delete comentario', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue({
        id: 'co1',
        deletedAt: null,
      })
      mockPrisma.comentario.update.mockResolvedValue({
        id: 'co1',
        deletedAt: expect.any(Date),
      })

      await deleteComentario('co1')
      expect(mockPrisma.comentario.update).toHaveBeenCalledWith({
        where: { id: 'co1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should throw if comentario not found', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue(null)

      await expect(deleteComentario('nonexistent')).rejects.toThrow(/não encontrado/i)
    })
  })

  describe('addReacao', () => {
    it('should add reaction to comentario', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue({
        id: 'co1',
        reacoes: { thumbsUp: 1 },
        deletedAt: null,
      })
      mockPrisma.comentario.update.mockResolvedValue({
        id: 'co1',
        reacoes: { thumbsUp: 2 },
      })

      const comentario = await addReacao('co1', 'thumbsUp')
      expect(comentario.reacoes).toBeDefined()
    })

    it('should throw if comentario not found', async () => {
      mockPrisma.comentario.findUnique.mockResolvedValue(null)

      await expect(addReacao('nonexistent', 'thumbsUp')).rejects.toThrow(/não encontrado/i)
    })
  })
})
