// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { CreateRoleSchema, UpdateRoleSchema } from '@/lib/validation/roleSchemas'

describe('roleSchemas', () => {
  describe('CreateRoleSchema', () => {
    it('should accept valid role (name, tenantId, scope)', () => {
      const result = CreateRoleSchema.safeParse({
        name: 'Admin',
        tenantId: 'tenant-1',
        scope: 'TENANT',
      })
      expect(result.success).toBe(true)
    })

    it('should accept TENANT scope', () => {
      const result = CreateRoleSchema.safeParse({
        name: 'Member',
        tenantId: 'tenant-1',
        scope: 'TENANT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scope).toBe('TENANT')
      }
    })

    it('should accept PROJETO scope', () => {
      const result = CreateRoleSchema.safeParse({
        name: 'Project Admin',
        tenantId: 'tenant-1',
        scope: 'PROJETO',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scope).toBe('PROJETO')
      }
    })

    it('should accept optional description', () => {
      const result = CreateRoleSchema.safeParse({
        name: 'Admin',
        tenantId: 'tenant-1',
        scope: 'TENANT',
        description: 'Administrator role',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Administrator role')
      }
    })

    it('should reject empty name', () => {
      const result = CreateRoleSchema.safeParse({
        name: '',
        tenantId: 'tenant-1',
        scope: 'TENANT',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid scope', () => {
      const result = CreateRoleSchema.safeParse({
        name: 'Role',
        tenantId: 'tenant-1',
        scope: 'INVALIDO',
      })
      expect(result.success).toBe(false)
    })

    it('should trim name', () => {
      const result = CreateRoleSchema.safeParse({
        name: '  Admin  ',
        tenantId: 'tenant-1',
        scope: 'TENANT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Admin')
      }
    })
  })

  describe('UpdateRoleSchema', () => {
    it('should accept name update', () => {
      const result = UpdateRoleSchema.safeParse({
        name: 'Super Admin',
      })
      expect(result.success).toBe(true)
    })

    it('should accept description update', () => {
      const result = UpdateRoleSchema.safeParse({
        description: 'Updated description',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty name on update', () => {
      const result = UpdateRoleSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateRoleSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
