import { describe, it, expect } from 'vitest'
import { CreateDepartamentoSchema, UpdateDepartamentoSchema } from '@/lib/validation/departamentoSchemas'

describe('departamentoSchemas', () => {
  describe('CreateDepartamentoSchema', () => {
    it('should accept valid departamento (name, tenantId)', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: 'Engenharia',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: '',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing tenantId', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: 'Engenharia',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional description', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: 'Engenharia',
        tenantId: 'tenant-1',
        description: 'Departamento de engenharia',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Departamento de engenharia')
      }
    })

    it('should accept optional hourlyRate', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: 'Engenharia',
        tenantId: 'tenant-1',
        hourlyRate: 150.0,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hourlyRate).toBe(150.0)
      }
    })

    it('should reject negative hourlyRate', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: 'Engenharia',
        tenantId: 'tenant-1',
        hourlyRate: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should trim name', () => {
      const result = CreateDepartamentoSchema.safeParse({
        name: '  Engenharia  ',
        tenantId: 'tenant-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Engenharia')
      }
    })
  })

  describe('UpdateDepartamentoSchema', () => {
    it('should accept partial updates (name only)', () => {
      const result = UpdateDepartamentoSchema.safeParse({ name: 'Novo Nome' })
      expect(result.success).toBe(true)
    })

    it('should accept active boolean', () => {
      const result = UpdateDepartamentoSchema.safeParse({ active: false })
      expect(result.success).toBe(true)
    })

    it('should accept hourlyRate update', () => {
      const result = UpdateDepartamentoSchema.safeParse({ hourlyRate: 200 })
      expect(result.success).toBe(true)
    })

    it('should reject negative hourlyRate', () => {
      const result = UpdateDepartamentoSchema.safeParse({ hourlyRate: -5 })
      expect(result.success).toBe(false)
    })
  })
})
