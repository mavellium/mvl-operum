import { describe, it, expect } from 'vitest'
import { CreateComentarioSchema, UpdateComentarioSchema } from '@/lib/validation/comentarioSchemas'

describe('comentarioSchemas', () => {
  describe('CreateComentarioSchema', () => {
    it('should accept valid comentario (texto, cardId, userId)', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Este é um comentário de teste',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional tipo (COMENTARIO)', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        tipo: 'COMENTARIO',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tipo).toBe('COMENTARIO')
      }
    })

    it('should accept FEEDBACK tipo', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Feedback',
        cardId: 'card-1',
        userId: 'user-1',
        tipo: 'FEEDBACK',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid tipo', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        tipo: 'INVALID',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty texto', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: '',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing cardId', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Comment',
        userId: 'user-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Comment',
        cardId: 'card-1',
      })
      expect(result.success).toBe(false)
    })

    it('should trim texto', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: '  comentário com espaços  ',
        cardId: 'card-1',
        userId: 'user-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.texto).toBe('comentário com espaços')
      }
    })

    it('should accept optional reacoes (JSON)', () => {
      const result = CreateComentarioSchema.safeParse({
        texto: 'Comment',
        cardId: 'card-1',
        userId: 'user-1',
        reacoes: { thumbsUp: 2, love: 1 },
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reacoes).toBeDefined()
      }
    })
  })

  describe('UpdateComentarioSchema', () => {
    it('should accept texto update', () => {
      const result = UpdateComentarioSchema.safeParse({
        texto: 'Updated comment',
      })
      expect(result.success).toBe(true)
    })

    it('should accept tipo update', () => {
      const result = UpdateComentarioSchema.safeParse({
        tipo: 'FEEDBACK',
      })
      expect(result.success).toBe(true)
    })

    it('should accept reacoes update', () => {
      const result = UpdateComentarioSchema.safeParse({
        reacoes: { thumbsUp: 3 },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid tipo on update', () => {
      const result = UpdateComentarioSchema.safeParse({
        tipo: 'INVALIDO',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateComentarioSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject empty texto on update', () => {
      const result = UpdateComentarioSchema.safeParse({
        texto: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
