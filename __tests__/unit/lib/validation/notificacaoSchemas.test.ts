import { describe, it, expect } from 'vitest'
import { CreateNotificacaoSchema, UpdateNotificacaoSchema } from '@/lib/validation/notificacaoSchemas'

describe('notificacaoSchemas', () => {
  describe('CreateNotificacaoSchema', () => {
    it('should accept valid notification (userId, type, title, message)', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'COMMENT',
        title: 'Novo comentário',
        message: 'Alguém comentou em seu card',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional reference', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'ASSIGNMENT',
        title: 'Card atribuído',
        message: 'Você foi atribuído a um card',
        reference: 'card-123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reference).toBe('card-123')
      }
    })

    it('should accept optional referenceType', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'UPDATE',
        title: 'Card atualizado',
        message: 'Um card foi atualizado',
        referenceType: 'CARD',
      })
      expect(result.success).toBe(true)
    })

    it('should accept all valid types', () => {
      const types = ['COMMENT', 'ASSIGNMENT', 'UPDATE', 'COMPLETION', 'MENTIONED', 'INVITATION']
      types.forEach((type) => {
        const result = CreateNotificacaoSchema.safeParse({
          userId: 'user-1',
          type,
          title: 'Test',
          message: 'Test message',
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid type', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'INVALIDO',
        title: 'Test',
        message: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty title', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'COMMENT',
        title: '',
        message: 'Message',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty message', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'COMMENT',
        title: 'Title',
        message: '',
      })
      expect(result.success).toBe(false)
    })

    it('should trim title and message', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        type: 'COMMENT',
        title: '  Novo comentário  ',
        message: '  Alguém comentou  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Novo comentário')
        expect(result.data.message).toBe('Alguém comentou')
      }
    })
  })

  describe('UpdateNotificacaoSchema', () => {
    it('should accept status update', () => {
      const result = UpdateNotificacaoSchema.safeParse({
        status: 'READ',
      })
      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      const statuses = ['UNREAD', 'READ', 'ARCHIVED']
      statuses.forEach((status) => {
        const result = UpdateNotificacaoSchema.safeParse({ status })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const result = UpdateNotificacaoSchema.safeParse({
        status: 'INVALIDO',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateNotificacaoSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
