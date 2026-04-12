// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { create, findAllByUser, findById, markAsRead, markAsArchived, deleteNotificacao, countUnread } from '@/services/notificacaoService'

const mockPrisma = prisma as {
  notification: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NotificacaoService', () => {
  describe('create', () => {
    it('should create notification with default status UNREAD', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        type: 'COMMENT',
        title: 'Novo comentário',
        message: 'Alguém comentou',
        status: 'UNREAD',
        reference: null,
        referenceType: null,
        deletedAt: null,
        createdAt: new Date(),
        readAt: null,
        updatedAt: new Date(),
      })

      const notif = await create({
        userId: 'user-1',
        type: 'COMMENT',
        title: 'Novo comentário',
        message: 'Alguém comentou',
      })
      expect(notif.status).toBe('UNREAD')
      expect(notif.type).toBe('COMMENT')
    })

    it('should create with reference and referenceType', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        type: 'ASSIGNMENT',
        title: 'Card atribuído',
        message: 'Você foi atribuído',
        reference: 'card-123',
        referenceType: 'CARD',
        status: 'UNREAD',
        deletedAt: null,
      })

      const notif = await create({
        userId: 'user-1',
        type: 'ASSIGNMENT',
        title: 'Card atribuído',
        message: 'Você foi atribuído',
        reference: 'card-123',
        referenceType: 'CARD',
      })
      expect(notif.reference).toBe('card-123')
      expect(notif.referenceType).toBe('CARD')
    })

    it('should reject invalid type', async () => {
      await expect(
        create({
          userId: 'user-1',
          type: 'INVALIDO' as 'COMMENT',
          title: 'Test',
          message: 'Test',
        }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByUser', () => {
    it('should return notifications for user ordered by date desc', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'n1', userId: 'user-1', type: 'COMMENT', status: 'UNREAD' },
        { id: 'n2', userId: 'user-1', type: 'ASSIGNMENT', status: 'READ' },
      ])

      const notifs = await findAllByUser('user-1')
      expect(notifs).toHaveLength(2)
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', deletedAt: null }),
          orderBy: { createdAt: 'desc' },
        }),
      )
    })

    it('should filter deleted notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([])

      await findAllByUser('user-1')
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should support filtering by status', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([])

      await findAllByUser('user-1', { status: 'UNREAD' })
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'UNREAD' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return notification by id', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        title: 'Test',
        status: 'UNREAD',
        deletedAt: null,
      })

      const notif = await findById('n1')
      expect(notif?.id).toBe('n1')
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null)

      const notif = await findById('nonexistent')
      expect(notif).toBeNull()
    })
  })

  describe('markAsRead', () => {
    it('should set status to READ and readAt', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        status: 'UNREAD',
        deletedAt: null,
      })
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        status: 'READ',
        readAt: new Date(),
      })

      const notif = await markAsRead('n1')
      expect(notif.status).toBe('READ')
      expect(notif.readAt).toBeDefined()
    })

    it('should throw if notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null)

      await expect(markAsRead('nonexistent')).rejects.toThrow(/not found/i)
    })
  })

  describe('markAsArchived', () => {
    it('should set status to ARCHIVED', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        status: 'UNREAD',
        deletedAt: null,
      })
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        status: 'ARCHIVED',
      })

      const notif = await markAsArchived('n1')
      expect(notif.status).toBe('ARCHIVED')
    })
  })

  describe('deleteNotificacao', () => {
    it('should soft delete notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        deletedAt: null,
      })
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        deletedAt: expect.any(Date),
      })

      await deleteNotificacao('n1')
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should throw if notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null)

      await expect(deleteNotificacao('nonexistent')).rejects.toThrow(/not found/i)
    })
  })

  describe('countUnread', () => {
    it('should count unread notifications for user', async () => {
      mockPrisma.notification.count.mockResolvedValue(3)

      const count = await countUnread('user-1')
      expect(count).toBe(3)
      expect(mockPrisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', status: 'UNREAD', deletedAt: null }),
        }),
      )
    })

    it('should return 0 for user with no unread', async () => {
      mockPrisma.notification.count.mockResolvedValue(0)

      const count = await countUnread('user-1')
      expect(count).toBe(0)
    })
  })
})
