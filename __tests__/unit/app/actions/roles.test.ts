// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/roleService', () => ({
  createRole: vi.fn(),
  findAllByTenant: vi.fn(),
  updateRole: vi.fn(),
  assignPermission: vi.fn(),
  removePermission: vi.fn(),
  getOrCreateRole: vi.fn(),
  softDeleteRole: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import {
  createRole,
  findAllByTenant,
  updateRole,
  assignPermission,
  removePermission,
  getOrCreateRole,
  softDeleteRole,
} from '@/services/roleService'
import {
  createRoleAction,
  getRolesAction,
  updateRoleAction,
  assignPermissionAction,
  removePermissionAction,
  getOrCreateRoleAction,
  updateRoleNameAction,
  deleteRoleAction,
} from '@/app/actions/roles'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Role Actions', () => {
  describe('createRoleAction', () => {
    it('should create role and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(createRole).mockResolvedValue({
        id: 'r1',
        name: 'Admin',
        tenantId: 't1',
        scope: 'TENANT',
      })

      const result = await createRoleAction({}, { name: 'Admin', scope: 'TENANT' })
      expect(result).toHaveProperty('role')
      expect(result.role?.name).toBe('Admin')
    })

    it('should return error on validation failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(createRole).mockRejectedValue(new Error('Validation error'))

      const result = await createRoleAction({}, { name: '', scope: 'TENANT' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getRolesAction', () => {
    it('should return list of roles for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(findAllByTenant).mockResolvedValue([
        { id: 'r1', name: 'Admin' },
        { id: 'r2', name: 'Member' },
      ])

      const result = await getRolesAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(verifySession).mockRejectedValue(new Error('Auth error'))

      const result = await getRolesAction()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('updateRoleAction', () => {
    it('should update role and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateRole).mockResolvedValue({
        id: 'r1',
        name: 'Super Admin',
      })

      const result = await updateRoleAction({}, 'r1', { name: 'Super Admin' })
      expect(result).toHaveProperty('role')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateRole).mockRejectedValue(new Error('Not found'))

      const result = await updateRoleAction({}, 'nonexistent', { name: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('assignPermissionAction', () => {
    it('should assign permission and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(assignPermission).mockResolvedValue({
        roleId: 'r1',
        permissionId: 'p1',
      })

      const result = await assignPermissionAction('r1', 'p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if already assigned', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(assignPermission).mockRejectedValue(new Error('Already assigned'))

      const result = await assignPermissionAction('r1', 'p1')
      expect(result).toHaveProperty('error')
    })
  })

  describe('removePermissionAction', () => {
    it('should remove permission and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(removePermission).mockResolvedValue({ id: 'rp1' })

      const result = await removePermissionAction('r1', 'p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if not found', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(removePermission).mockRejectedValue(new Error('Not found'))

      const result = await removePermissionAction('r1', 'p1')
      expect(result).toHaveProperty('error')
    })
  })

  describe('getOrCreateRoleAction', () => {
    it('should return role on success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(getOrCreateRole).mockResolvedValue({ id: 'r1', name: 'TI', nameKey: 'ti' })

      const result = await getOrCreateRoleAction('TI')
      expect(result).toHaveProperty('role')
      expect((result as { role?: { name: string } }).role?.name).toBe('TI')
    })

    it('should return error on failure', async () => {
      vi.mocked(verifySession).mockRejectedValue(new Error('Auth error'))

      const result = await getOrCreateRoleAction('TI')
      expect(result).toHaveProperty('error')
    })
  })

  describe('updateRoleNameAction', () => {
    it('should update role name and return role', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateRole).mockResolvedValue({ id: 'r1', name: 'Technology', nameKey: 'technology' })

      const result = await updateRoleNameAction('r1', 'Technology')
      expect(result).toHaveProperty('role')
      expect((result as { role?: { name: string } }).role?.name).toBe('Technology')
    })

    it('should return error on failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateRole).mockRejectedValue(new Error('Not found'))

      const result = await updateRoleNameAction('nonexistent', 'X')
      expect(result).toHaveProperty('error')
    })
  })

  describe('deleteRoleAction', () => {
    it('should soft-delete role and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(softDeleteRole).mockResolvedValue({ id: 'r1', deletedAt: new Date() })

      const result = await deleteRoleAction('r1')
      expect(result).toHaveProperty('success')
      expect((result as { success?: boolean }).success).toBe(true)
    })

    it('should return error on failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(softDeleteRole).mockRejectedValue(new Error('Not found'))

      const result = await deleteRoleAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })
})
