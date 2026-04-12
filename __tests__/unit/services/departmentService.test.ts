// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    department: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userDepartment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    userProject: {
      updateMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createDepartment,
  findAllByTenant,
  updateDepartment,
  deactivate,
  getOrCreateDepartment,
  softDeleteDepartment,
  associateUser,
  dissociateUser,
} from '@/services/departmentService'

const mockPrisma = prisma as unknown as {
  department: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  userDepartment: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  userProject: {
    updateMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DepartmentService', () => {
  describe('createDepartment', () => {
    it('should create department linked to tenant', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null)
      mockPrisma.department.create.mockResolvedValue({
        id: 'd1',
        name: 'Engineering',
        tenantId: 'tenant-1',
        description: null,
        active: true,
        hourlyRate: null,
        deletedAt: null,
      })

      const dept = await createDepartment({ name: 'Engineering', tenantId: 'tenant-1' })
      expect(dept.name).toBe('Engineering')
      expect(dept.tenantId).toBe('tenant-1')
      expect(dept.active).toBe(true)
    })

    it('should reject duplicate name within tenant', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createDepartment({ name: 'Engineering', tenantId: 'tenant-1' }),
      ).rejects.toThrow(/already exists/i)
    })

    it('should reject invalid input (empty name)', async () => {
      await expect(
        createDepartment({ name: '', tenantId: 'tenant-1' }),
      ).rejects.toThrow()
    })

    it('should accept optional hourlyRate', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null)
      mockPrisma.department.create.mockResolvedValue({
        id: 'd1',
        name: 'Engineering',
        tenantId: 'tenant-1',
        hourlyRate: 150.0,
        active: true,
      })

      const dept = await createDepartment({ name: 'Engineering', tenantId: 'tenant-1', hourlyRate: 150.0 })
      expect(dept.hourlyRate).toBe(150.0)
    })
  })

  describe('findAllByTenant', () => {
    it('should return departments filtered by tenant', async () => {
      mockPrisma.department.findMany.mockResolvedValue([
        { id: 'd1', name: 'Engineering', tenantId: 'tenant-1' },
      ])

      const depts = await findAllByTenant('tenant-1')
      expect(depts).toHaveLength(1)
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: null }),
        }),
      )
    })

    it('should not return soft-deleted departments', async () => {
      mockPrisma.department.findMany.mockResolvedValue([
        { id: 'd2', name: 'Finance', tenantId: 'tenant-1', deletedAt: null },
      ])

      const list = await findAllByTenant('tenant-1')

      expect(list.find(d => d.id === 'd1')).toBeUndefined()
      expect(list).toHaveLength(1)
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('updateDepartment', () => {
    it('should update department name', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'd1',
        name: 'Old',
        active: true,
        deletedAt: null,
      })
      mockPrisma.department.update.mockResolvedValue({
        id: 'd1',
        name: 'New Name',
      })

      const dept = await updateDepartment('d1', { name: 'New Name' })
      expect(dept.name).toBe('New Name')
    })

    it('should throw if department not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null)

      await expect(
        updateDepartment('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(/not found/i)
    })
  })

  describe('deactivate', () => {
    it('should set active = false', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'd1',
        active: true,
        deletedAt: null,
      })
      mockPrisma.userDepartment.findMany.mockResolvedValue([])
      mockPrisma.department.update.mockResolvedValue({
        id: 'd1',
        active: false,
      })

      const dept = await deactivate('d1')
      expect(dept.active).toBe(false)
    })

    it('should reject if users still associated', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'd1',
        active: true,
        deletedAt: null,
      })
      mockPrisma.userDepartment.findMany.mockResolvedValue([
        { id: 'ud1', userId: 'u1' },
      ])

      await expect(deactivate('d1')).rejects.toThrow(/associated users/i)
    })
  })

  describe('associateUser', () => {
    it('should create UserDepartment link', async () => {
      mockPrisma.userDepartment.findUnique.mockResolvedValue(null)
      mockPrisma.userDepartment.create.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departmentId: 'd1',
      })

      const link = await associateUser('d1', 'u1')
      expect(link.userId).toBe('u1')
      expect(link.departmentId).toBe('d1')
    })

    it('should reject duplicate user-department', async () => {
      mockPrisma.userDepartment.findUnique.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departmentId: 'd1',
      })

      await expect(associateUser('d1', 'u1')).rejects.toThrow(/already associated/i)
    })
  })

  describe('dissociateUser', () => {
    it('should remove UserDepartment link', async () => {
      mockPrisma.userDepartment.findUnique.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departmentId: 'd1',
      })
      mockPrisma.userDepartment.delete.mockResolvedValue({
        id: 'ud1',
      })

      await dissociateUser('d1', 'u1')
      expect(mockPrisma.userDepartment.delete).toHaveBeenCalled()
    })

    it('should throw if association not found', async () => {
      mockPrisma.userDepartment.findUnique.mockResolvedValue(null)

      await expect(dissociateUser('d1', 'u1')).rejects.toThrow(/not found/i)
    })
  })

  describe('getOrCreateDepartment', () => {
    it('should preserve original case when creating a new department', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null)
      mockPrisma.department.create.mockResolvedValue({
        id: 'd1',
        name: 'IT',
        tenantId: 'tenant-1',
        deletedAt: null,
      })

      await getOrCreateDepartment('IT', 'tenant-1')

      expect(mockPrisma.department.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'IT' }) }),
      )
    })

    it('should return existing department without creating duplicate', async () => {
      const existing = { id: 'd1', name: 'IT', tenantId: 'tenant-1' }
      mockPrisma.department.findFirst.mockResolvedValue(existing)

      const result = await getOrCreateDepartment('it', 'tenant-1')

      expect(mockPrisma.department.create).not.toHaveBeenCalled()
      expect(result).toEqual(existing)
    })
  })

  describe('softDeleteDepartment', () => {
    it('should remove UserDepartment links and null UserProject references before soft-deleting', async () => {
      mockPrisma.userDepartment.deleteMany.mockResolvedValue({ count: 2 })
      mockPrisma.userProject.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.department.update.mockResolvedValue({
        id: 'd1',
        deletedAt: new Date(),
      })

      await softDeleteDepartment('d1')

      expect(mockPrisma.userDepartment.deleteMany).toHaveBeenCalledWith({
        where: { departmentId: 'd1' },
      })
      expect(mockPrisma.userProject.updateMany).toHaveBeenCalledWith({
        where: { departmentId: 'd1' },
        data: { departmentId: null },
      })
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should soft-delete even when no linked records exist', async () => {
      mockPrisma.userDepartment.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.userProject.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.department.update.mockResolvedValue({
        id: 'd2',
        deletedAt: new Date(),
      })

      await softDeleteDepartment('d2')

      expect(mockPrisma.userDepartment.deleteMany).toHaveBeenCalledWith({
        where: { departmentId: 'd2' },
      })
      expect(mockPrisma.userProject.updateMany).toHaveBeenCalledWith({
        where: { departmentId: 'd2' },
        data: { departmentId: null },
      })
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'd2' },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })
})
