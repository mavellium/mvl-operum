// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/departmentService', () => ({
  createDepartment: vi.fn(),
  findAllByTenant: vi.fn(),
  updateDepartment: vi.fn(),
  deactivate: vi.fn(),
  getOrCreateDepartment: vi.fn(),
  softDeleteDepartment: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import {
  createDepartment,
  findAllByTenant,
  updateDepartment,
  deactivate,
  getOrCreateDepartment,
  softDeleteDepartment,
} from '@/services/departmentService'
import {
  createDepartmentAction,
  getDepartmentsAction,
  updateDepartmentAction,
  deactivateDepartmentAction,
  getOrCreateDepartmentAction,
  updateDepartmentNameAction,
  deleteDepartmentAction,
} from '@/app/actions/departments'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Department Actions', () => {
  describe('createDepartmentAction', () => {
    it('should create department and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createDepartment as any).mockResolvedValue({
        id: 'd1',
        name: 'Engineering',
        tenantId: 't1',
      })

      const result = await createDepartmentAction({}, { name: 'Engineering' })
      expect(result).toHaveProperty('department')
      expect(result.department?.name).toBe('Engineering')
    })

    it('should return error on validation failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createDepartment as any).mockRejectedValue(new Error('Validation error'))

      const result = await createDepartmentAction({}, { name: '' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getDepartmentsAction', () => {
    it('should return list of departments for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findAllByTenant as any).mockResolvedValue([
        { id: 'd1', name: 'Engineering' },
        { id: 'd2', name: 'Design' },
      ])

      const result = await getDepartmentsAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Auth error'))

      const result = await getDepartmentsAction()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('updateDepartmentAction', () => {
    it('should update department and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartment as any).mockResolvedValue({
        id: 'd1',
        name: 'Updated Dept',
      })

      const result = await updateDepartmentAction({}, 'd1', { name: 'Updated Dept' })
      expect(result).toHaveProperty('department')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartment as any).mockRejectedValue(new Error('Not found'))

      const result = await updateDepartmentAction({}, 'nonexistent', { name: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('deactivateDepartmentAction', () => {
    it('should deactivate department and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deactivate as any).mockResolvedValue({ id: 'd1', active: false })

      const result = await deactivateDepartmentAction('d1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if deactivation fails', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deactivate as any).mockRejectedValue(new Error('Has users'))

      const result = await deactivateDepartmentAction('d1')
      expect(result).toHaveProperty('error')
    })
  })

  describe('getOrCreateDepartmentAction', () => {
    it('should return department preserving original case', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(getOrCreateDepartment as any).mockResolvedValue({ id: 'd1', name: 'IT', tenantId: 't1' })

      const result = await getOrCreateDepartmentAction('IT')
      expect(result).toHaveProperty('department')
      expect((result as any).department.name).toBe('IT')
    })

    it('should return error on failure', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Auth error'))

      const result = await getOrCreateDepartmentAction('IT')
      expect(result).toHaveProperty('error')
    })
  })

  describe('updateDepartmentNameAction', () => {
    it('should call updateDepartment with trimmed name preserving case', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartment as any).mockResolvedValue({ id: 'd1', name: 'Technology' })

      const result = await updateDepartmentNameAction('d1', 'Technology')
      expect(result).toHaveProperty('department')
      expect((result as any).department.name).toBe('Technology')
      // Must NOT downcase — should pass 'Technology', not 'technology'
      expect(updateDepartment).toHaveBeenCalledWith('d1', { name: 'Technology' })
    })

    it('should return error on failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartment as any).mockRejectedValue(new Error('Not found'))

      const result = await updateDepartmentNameAction('nonexistent', 'X')
      expect(result).toHaveProperty('error')
    })
  })

  describe('deleteDepartmentAction', () => {
    it('should soft-delete department and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(softDeleteDepartment as any).mockResolvedValue({ id: 'd1', deletedAt: new Date() })

      const result = await deleteDepartmentAction('d1')
      expect(result).toHaveProperty('success')
      expect((result as any).success).toBe(true)
    })

    it('should return error on failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(softDeleteDepartment as any).mockRejectedValue(new Error('Not found'))

      const result = await deleteDepartmentAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })
})
