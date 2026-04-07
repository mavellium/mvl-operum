import { describe, it, expect } from 'vitest'
import { CreateRoleSchema, UpdateRoleSchema } from '@/lib/validation/roleSchemas'

describe('roleSchemas', () => {
  describe('CreateRoleSchema', () => {
    it('should accept valid role (nome, tenantId, escopo)', () => {
      const result = CreateRoleSchema.safeParse({
        nome: 'Admin',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
      })
      expect(result.success).toBe(true)
    })

    it('should accept TENANT escopo', () => {
      const result = CreateRoleSchema.safeParse({
        nome: 'Member',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.escopo).toBe('TENANT')
      }
    })

    it('should accept PROJETO escopo', () => {
      const result = CreateRoleSchema.safeParse({
        nome: 'Project Admin',
        tenantId: 'tenant-1',
        escopo: 'PROJETO',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.escopo).toBe('PROJETO')
      }
    })

    it('should accept optional descricao', () => {
      const result = CreateRoleSchema.safeParse({
        nome: 'Admin',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
        descricao: 'Administrator role',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.descricao).toBe('Administrator role')
      }
    })

    it('should reject empty nome', () => {
      const result = CreateRoleSchema.safeParse({
        nome: '',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid escopo', () => {
      const result = CreateRoleSchema.safeParse({
        nome: 'Role',
        tenantId: 'tenant-1',
        escopo: 'INVALIDO',
      })
      expect(result.success).toBe(false)
    })

    it('should trim nome', () => {
      const result = CreateRoleSchema.safeParse({
        nome: '  Admin  ',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nome).toBe('Admin')
      }
    })
  })

  describe('UpdateRoleSchema', () => {
    it('should accept nome update', () => {
      const result = UpdateRoleSchema.safeParse({
        nome: 'Super Admin',
      })
      expect(result.success).toBe(true)
    })

    it('should accept descricao update', () => {
      const result = UpdateRoleSchema.safeParse({
        descricao: 'Updated description',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty nome on update', () => {
      const result = UpdateRoleSchema.safeParse({
        nome: '',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateRoleSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
