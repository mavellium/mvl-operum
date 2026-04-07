import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/roleService', () => ({
  createRole: vi.fn(),
  findAllByTenant: vi.fn(),
  updateRole: vi.fn(),
  assignPermission: vi.fn(),
  removePermission: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { createRole, findAllByTenant, updateRole, assignPermission, removePermission } from '@/services/roleService'
import {
  createRoleAction,
  getRolesAction,
  updateRoleAction,
  assignPermissionAction,
  removePermissionAction,
} from '@/app/actions/roles'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Role Actions', () => {
  describe('createRoleAction', () => {
    it('should create role and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createRole as any).mockResolvedValue({
        id: 'r1',
        nome: 'Admin',
        tenantId: 't1',
        escopo: 'TENANT',
      })

      const result = await createRoleAction({}, { nome: 'Admin', escopo: 'TENANT' })
      expect(result).toHaveProperty('role')
      expect(result.role?.nome).toBe('Admin')
    })

    it('should return error on validation failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createRole as any).mockRejectedValue(new Error('Validation error'))

      const result = await createRoleAction({}, { nome: '', escopo: 'TENANT' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getRolesAction', () => {
    it('should return list of roles for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findAllByTenant as any).mockResolvedValue([
        { id: 'r1', nome: 'Admin' },
        { id: 'r2', nome: 'Member' },
      ])

      const result = await getRolesAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Auth error'))

      const result = await getRolesAction()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('updateRoleAction', () => {
    it('should update role and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateRole as any).mockResolvedValue({
        id: 'r1',
        nome: 'Super Admin',
      })

      const result = await updateRoleAction({}, 'r1', { nome: 'Super Admin' })
      expect(result).toHaveProperty('role')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateRole as any).mockRejectedValue(new Error('Not found'))

      const result = await updateRoleAction({}, 'nonexistent', { nome: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('assignPermissionAction', () => {
    it('should assign permission and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(assignPermission as any).mockResolvedValue({
        roleId: 'r1',
        permissionId: 'p1',
      })

      const result = await assignPermissionAction('r1', 'p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if already assigned', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(assignPermission as any).mockRejectedValue(new Error('Already assigned'))

      const result = await assignPermissionAction('r1', 'p1')
      expect(result).toHaveProperty('error')
    })
  })

  describe('removePermissionAction', () => {
    it('should remove permission and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(removePermission as any).mockResolvedValue({ id: 'rp1' })

      const result = await removePermissionAction('r1', 'p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if not found', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(removePermission as any).mockRejectedValue(new Error('Not found'))

      const result = await removePermissionAction('r1', 'p1')
      expect(result).toHaveProperty('error')
    })
  })
})
