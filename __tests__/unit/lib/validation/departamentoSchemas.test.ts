import { describe, it, expect } from 'vitest'
import { CreateDepartamentoSchema, UpdateDepartamentoSchema } from '@/lib/validation/departamentoSchemas'

describe('departamentoSchemas', () => {
  describe('CreateDepartamentoSchema', () => {
    it('should accept valid departamento (nome, tenantId)', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: 'Engenharia',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty nome', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: '',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing tenantId', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: 'Engenharia',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional descricao', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: 'Engenharia',
        tenantId: 'tenant-1',
        descricao: 'Departamento de engenharia',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.descricao).toBe('Departamento de engenharia')
      }
    })

    it('should accept optional valorHora', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: 'Engenharia',
        tenantId: 'tenant-1',
        valorHora: 150.0,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.valorHora).toBe(150.0)
      }
    })

    it('should reject negative valorHora', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: 'Engenharia',
        tenantId: 'tenant-1',
        valorHora: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should trim nome', () => {
      const result = CreateDepartamentoSchema.safeParse({
        nome: '  Engenharia  ',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nome).toBe('Engenharia')
      }
    })
  })

  describe('UpdateDepartamentoSchema', () => {
    it('should accept partial updates (nome only)', () => {
      const result = UpdateDepartamentoSchema.safeParse({ nome: 'Novo Nome' })
      expect(result.success).toBe(true)
    })

    it('should accept ativo boolean', () => {
      const result = UpdateDepartamentoSchema.safeParse({ ativo: false })
      expect(result.success).toBe(true)
    })

    it('should accept valorHora update', () => {
      const result = UpdateDepartamentoSchema.safeParse({ valorHora: 200 })
      expect(result.success).toBe(true)
    })

    it('should reject negative valorHora', () => {
      const result = UpdateDepartamentoSchema.safeParse({ valorHora: -5 })
      expect(result.success).toBe(false)
    })
  })
})
