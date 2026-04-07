import { describe, it, expect } from 'vitest'
import { CreateNotificacaoSchema, UpdateNotificacaoSchema } from '@/lib/validation/notificacaoSchemas'

describe('notificacaoSchemas', () => {
  describe('CreateNotificacaoSchema', () => {
    it('should accept valid notificacao (userId, tipo, titulo, mensagem)', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: 'Novo comentário',
        mensagem: 'Alguém comentou em seu card',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional referencia', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'ATRIBUICAO',
        titulo: 'Card atribuído',
        mensagem: 'Você foi atribuído a um card',
        referencia: 'card-123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referencia).toBe('card-123')
      }
    })

    it('should accept optional referenciaTipo', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'ATUALIZACAO',
        titulo: 'Card atualizado',
        mensagem: 'Um card foi atualizado',
        referenciaTipo: 'CARD',
      })
      expect(result.success).toBe(true)
    })

    it('should accept all valid tipos', () => {
      const tipos = ['COMENTARIO', 'ATRIBUICAO', 'ATUALIZACAO', 'CONCLUSAO', 'MENCIONADO', 'CONVITE']
      tipos.forEach((tipo) => {
        const result = CreateNotificacaoSchema.safeParse({
          userId: 'user-1',
          tipo,
          titulo: 'Test',
          mensagem: 'Test message',
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid tipo', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'INVALIDO',
        titulo: 'Test',
        mensagem: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty titulo', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: '',
        mensagem: 'Message',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty mensagem', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: 'Title',
        mensagem: '',
      })
      expect(result.success).toBe(false)
    })

    it('should trim titulo and mensagem', () => {
      const result = CreateNotificacaoSchema.safeParse({
        userId: 'user-1',
        tipo: 'COMENTARIO',
        titulo: '  Novo comentário  ',
        mensagem: '  Alguém comentou  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.titulo).toBe('Novo comentário')
        expect(result.data.mensagem).toBe('Alguém comentou')
      }
    })
  })

  describe('UpdateNotificacaoSchema', () => {
    it('should accept status update', () => {
      const result = UpdateNotificacaoSchema.safeParse({
        status: 'LIDA',
      })
      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      const statuses = ['NAO_LIDA', 'LIDA', 'ARQUIVADA']
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
