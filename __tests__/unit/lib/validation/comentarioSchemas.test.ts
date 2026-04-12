import { describe, it, expect } from 'vitest'
import { CreateComentarioSchema, UpdateComentarioSchema } from '@/lib/validation/comentarioSchemas'

describe('comentarioSchemas', () => {
  describe('CreateComentarioSchema', () => {
    it('should accept valid comment (content, cardId, userId)', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Este é um comentário de teste',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional type (COMMENT)', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        type: 'COMMENT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('COMMENT')
      }
    })

    it('should accept FEEDBACK type', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Feedback',
        cardId: 'card-1',
        userId: 'user-1',
        type: 'FEEDBACK',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid type', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        type: 'INVALID',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty content', () => {
      const result = CreateComentarioSchema.safeParse({
        content: '',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing cardId', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Comment',
        userId: 'user-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Comment',
        cardId: 'card-1',
      })
      expect(result.success).toBe(false)
    })

    it('should trim content', () => {
      const result = CreateComentarioSchema.safeParse({
        content: '  comentário com espaços  ',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('comentário com espaços')
      }
    })

    it('should accept optional reactions (JSON)', () => {
      const result = CreateComentarioSchema.safeParse({
        content: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        reactions: { thumbsUp: 2, love: 1 },
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reactions).toBeDefined()
      }
    })
  })

  describe('UpdateComentarioSchema', () => {
    it('should accept content update', () => {
      const result = UpdateComentarioSchema.safeParse({
        content: 'Updated comment',
      })
      expect(result.success).toBe(true)
    })

    it('should accept type update', () => {
      const result = UpdateComentarioSchema.safeParse({
        type: 'FEEDBACK',
      })
      expect(result.success).toBe(true)
    })

    it('should accept reactions update', () => {
      const result = UpdateComentarioSchema.safeParse({
        reactions: { thumbsUp: 3 },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid type on update', () => {
      const result = UpdateComentarioSchema.safeParse({
        type: 'INVALIDO',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateComentarioSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject empty content on update', () => {
      const result = UpdateComentarioSchema.safeParse({
        content: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
