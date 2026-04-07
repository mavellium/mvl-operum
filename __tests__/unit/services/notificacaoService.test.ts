// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    notificacao: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { create, findAllByUser, findById, markAsRead, markAsArchived, deleteNotificacao, countUnread } from '@/services/notificacaoService'

const mockPrisma = prisma as {
  notificacao: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NotificacaoService', () => {
  describe('create', () => {
    it('should create notificacao with default status NAO_LIDA', async () => {
      mockPrisma.notificacao.create.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: 'Novo comentário',
        mensagem: 'Alguém comentou',
        status: 'NAO_LIDA',
        referencia: null,
        referenciaTipo: null,
        deletedAt: null,
        criadoEm: new Date(),
        lido_em: null,
        updatedAt: new Date(),
      })

      const notif = await create({
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: 'Novo comentário',
        mensagem: 'Alguém comentou',
      })
      expect(notif.status).toBe('NAO_LIDA')
      expect(notif.tipo).toBe('COMENTARIO')
    })

    it('should create with referencia and referenciaTipo', async () => {
      mockPrisma.notificacao.create.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        tipo: 'ATRIBUICAO',
        titulo: 'Card atribuído',
        mensagem: 'Você foi atribuído',
        referencia: 'card-123',
        referenciaTipo: 'CARD',
        status: 'NAO_LIDA',
        deletedAt: null,
      })

      const notif = await create({
        userId: 'user-1',
        tipo: 'ATRIBUICAO',
        titulo: 'Card atribuído',
        mensagem: 'Você foi atribuído',
        referencia: 'card-123',
        referenciaTipo: 'CARD',
      })
      expect(notif.referencia).toBe('card-123')
      expect(notif.referenciaTipo).toBe('CARD')
    })

    it('should reject invalid tipo', async () => {
      await expect(
        create({
          userId: 'user-1',
          tipo: 'INVALIDO' as 'COMENTARIO',
          titulo: 'Test',
          mensagem: 'Test',
        }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByUser', () => {
    it('should return notificacoes for user ordered by date desc', async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([
        { id: 'n1', userId: 'user-1', tipo: 'COMENTARIO', status: 'NAO_LIDA' },
        { id: 'n2', userId: 'user-1', tipo: 'ATRIBUICAO', status: 'LIDA' },
      ])

      const notifs = await findAllByUser('user-1')
      expect(notifs).toHaveLength(2)
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', deletedAt: null }),
          orderBy: { criadoEm: 'desc' },
        }),
      )
    })

    it('should filter deleted notificacoes', async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([])

      await findAllByUser('user-1')
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should support filtering by status', async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([])

      await findAllByUser('user-1', { status: 'NAO_LIDA' })
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'NAO_LIDA' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return notificacao by id', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue({
        id: 'n1',
        titulo: 'Test',
        status: 'NAO_LIDA',
        deletedAt: null,
      })

      const notif = await findById('n1')
      expect(notif?.id).toBe('n1')
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue(null)

      const notif = await findById('nonexistent')
      expect(notif).toBeNull()
    })
  })

  describe('markAsRead', () => {
    it('should set status to LIDA and lido_em', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue({
        id: 'n1',
        status: 'NAO_LIDA',
        deletedAt: null,
      })
      mockPrisma.notificacao.update.mockResolvedValue({
        id: 'n1',
        status: 'LIDA',
        lido_em: new Date(),
      })

      const notif = await markAsRead('n1')
      expect(notif.status).toBe('LIDA')
      expect(notif.lido_em).toBeDefined()
    })

    it('should throw if notificacao not found', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue(null)

      await expect(markAsRead('nonexistent')).rejects.toThrow(/não encontrad/i)
    })
  })

  describe('markAsArchived', () => {
    it('should set status to ARQUIVADA', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue({
        id: 'n1',
        status: 'NAO_LIDA',
        deletedAt: null,
      })
      mockPrisma.notificacao.update.mockResolvedValue({
        id: 'n1',
        status: 'ARQUIVADA',
      })

      const notif = await markAsArchived('n1')
      expect(notif.status).toBe('ARQUIVADA')
    })
  })

  describe('deleteNotificacao', () => {
    it('should soft delete notificacao', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue({
        id: 'n1',
        deletedAt: null,
      })
      mockPrisma.notificacao.update.mockResolvedValue({
        id: 'n1',
        deletedAt: expect.any(Date),
      })

      await deleteNotificacao('n1')
      expect(mockPrisma.notificacao.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should throw if notificacao not found', async () => {
      mockPrisma.notificacao.findUnique.mockResolvedValue(null)

      await expect(deleteNotificacao('nonexistent')).rejects.toThrow(/não encontrad/i)
    })
  })

  describe('countUnread', () => {
    it('should count unread notificacoes for user', async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
      ])

      const count = await countUnread('user-1')
      expect(count).toBe(3)
      expect(mockPrisma.notificacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', status: 'NAO_LIDA', deletedAt: null }),
        }),
      )
    })

    it('should return 0 for user with no unread', async () => {
      mockPrisma.notificacao.findMany.mockResolvedValue([])

      const count = await countUnread('user-1')
      expect(count).toBe(0)
    })
  })
})
