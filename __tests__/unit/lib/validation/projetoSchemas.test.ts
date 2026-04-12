import { describe, it, expect } from 'vitest'
import { CreateProjetoSchema, UpdateProjetoSchema } from '@/lib/validation/projetoSchemas'

describe('projetoSchemas', () => {
  describe('CreateProjetoSchema', () => {
    it('should accept valid projeto data (name, tenantId)', () => {
      const result = CreateProjetoSchema.safeParse({
        name: 'Projeto Alpha',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional description', () => {
      const result = CreateProjetoSchema.safeParse({
        name: 'Projeto Alpha',
        tenantId: 'tenant-1',
        description: 'Descrição do projeto',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Descrição do projeto')
      }
    })

    it('should reject empty name', () => {
      const result = CreateProjetoSchema.safeParse({
        name: '',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 100 chars', () => {
      const result = CreateProjetoSchema.safeParse({
        name: 'a'.repeat(101),
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing tenantId', () => {
      const result = CreateProjetoSchema.safeParse({
        name: 'Projeto Alpha',
      })
      expect(result.success).toBe(false)
    })

    it('should trim name', () => {
      const result = CreateProjetoSchema.safeParse({
        name: '  Projeto Alpha  ',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Projeto Alpha')
      }
    })
  })

  describe('UpdateProjetoSchema', () => {
    it('should accept partial updates (name only)', () => {
      const result = UpdateProjetoSchema.safeParse({ name: 'Novo Nome' })
      expect(result.success).toBe(true)
    })

    it('should accept partial updates (description only)', () => {
      const result = UpdateProjetoSchema.safeParse({ description: 'Nova desc' })
      expect(result.success).toBe(true)
    })

    it('should accept valid status', () => {
      const result = UpdateProjetoSchema.safeParse({ status: 'COMPLETED' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = UpdateProjetoSchema.safeParse({ status: 'INVALIDO' })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateProjetoSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
