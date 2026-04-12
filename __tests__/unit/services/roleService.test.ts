// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rolePermission: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createRole,
  findAllByTenant,
  findById,
  updateRole,
  deleteRole,
  softDeleteRole,
  assignPermission,
  removePermission,
  assignUserToProject,
} from '@/services/roleService'

const mockPrisma = prisma as unknown as {
  role: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  rolePermission: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  userProjectRole: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RoleService', () => {
  describe('createRole', () => {
    it('should create role with TENANT scope', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null)
      mockPrisma.role.create.mockResolvedValue({
        id: 'r1',
        name: 'Admin',
        tenantId: 'tenant-1',
        scope: 'TENANT',
        description: null,
        deletedAt: null,
      })

      const role = await createRole({
        name: 'Admin',
        tenantId: 'tenant-1',
        scope: 'TENANT',
      })
      expect(role.name).toBe('Admin')
      expect(role.scope).toBe('TENANT')
    })

    it('should create role with PROJETO scope', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null)
      mockPrisma.role.create.mockResolvedValue({
        id: 'r2',
        name: 'Project Admin',
        tenantId: 'tenant-1',
        scope: 'PROJETO',
        description: null,
        deletedAt: null,
      })

      const role = await createRole({
        name: 'Project Admin',
        tenantId: 'tenant-1',
        scope: 'PROJETO',
      })
      expect(role.scope).toBe('PROJETO')
    })

    it('should reject duplicate role name in tenant with same scope', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createRole({
          name: 'Admin',
          tenantId: 'tenant-1',
          scope: 'TENANT',
        }),
      ).rejects.toThrow(/already exists/i)
    })

    it('should preserve original case in name and store lowercase in nameKey', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null)
      mockPrisma.role.create.mockResolvedValue({
        id: 'r1',
        name: 'TI',
        nameKey: 'ti',
        tenantId: 'tenant-1',
        scope: 'PROJETO',
        deletedAt: null,
      })

      await createRole({ name: 'TI', tenantId: 'tenant-1', scope: 'PROJETO' })

      expect(mockPrisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'TI', nameKey: 'ti' }),
        }),
      )
    })
  })

  describe('findAllByTenant', () => {
    it('should return roles for tenant', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'Admin' },
        { id: 'r2', name: 'Member' },
      ])

      const roles = await findAllByTenant('tenant-1')
      expect(roles).toHaveLength(2)
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: null }),
        }),
      )
    })

    it('should support filtering by scope', async () => {
      mockPrisma.role.findMany.mockResolvedValue([])

      await findAllByTenant('tenant-1', { scope: 'TENANT' })
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: 'TENANT' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return role with permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Admin',
        permissions: [{ permission: { name: 'read_cards' } }],
      })

      const role = await findById('r1')
      expect(role?.name).toBe('Admin')
    })

    it('should return null for deleted role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null)

      const role = await findById('r-deleted')
      expect(role).toBeNull()
    })
  })

  describe('updateRole', () => {
    it('should update role name', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Old',
        deletedAt: null,
      })
      mockPrisma.role.update.mockResolvedValue({
        id: 'r1',
        name: 'New Name',
      })

      const role = await updateRole('r1', { name: 'New Name' })
      expect(role.name).toBe('New Name')
    })

    it('should throw if role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null)

      await expect(
        updateRole('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(/not found/i)
    })
  })

  describe('deleteRole', () => {
    it('should soft delete role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', deletedAt: null })
      mockPrisma.role.update.mockResolvedValue({
        id: 'r1',
        deletedAt: expect.any(Date),
      })

      await deleteRole('r1')
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })

  describe('assignPermission', () => {
    it('should create RolePermission link', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null)
      mockPrisma.rolePermission.create.mockResolvedValue({
        id: 'rp1',
        roleId: 'r1',
        permissionId: 'perm-1',
      })

      const link = await assignPermission('r1', 'perm-1')
      expect(link.roleId).toBe('r1')
      expect(link.permissionId).toBe('perm-1')
    })

    it('should reject duplicate role-permission', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        assignPermission('r1', 'perm-1'),
      ).rejects.toThrow(/already has/i)
    })
  })

  describe('removePermission', () => {
    it('should delete RolePermission link', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue({
        id: 'rp1',
        roleId: 'r1',
        permissionId: 'perm-1',
      })
      mockPrisma.rolePermission.delete.mockResolvedValue({ id: 'rp1' })

      await removePermission('r1', 'perm-1')
      expect(mockPrisma.rolePermission.delete).toHaveBeenCalled()
    })

    it('should throw if permission not assigned', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null)

      await expect(
        removePermission('r1', 'perm-1'),
      ).rejects.toThrow(/not found/i)
    })
  })

  describe('softDeleteRole', () => {
    it('should soft-delete linked UserProjectRole rows before soft-deleting the role', async () => {
      mockPrisma.userProjectRole.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.role.update.mockResolvedValue({ id: 'r1', deletedAt: new Date() })

      await softDeleteRole('r1')

      expect(mockPrisma.userProjectRole.updateMany).toHaveBeenCalledWith({
        where: { roleId: 'r1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should soft-delete the role even if no UserProjectRole rows exist', async () => {
      mockPrisma.userProjectRole.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.role.update.mockResolvedValue({ id: 'r2', deletedAt: new Date() })

      await softDeleteRole('r2')

      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r2' },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })

  describe('assignUserToProject', () => {
    it('should create UserProjectRole link using userId_projectId unique key', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null)
      mockPrisma.userProjectRole.create.mockResolvedValue({
        id: 'upr1',
        userId: 'u1',
        projectId: 'p1',
        roleId: 'r1',
      })

      const link = await assignUserToProject('u1', 'p1', 'r1')
      expect(link.userId).toBe('u1')
      expect(link.roleId).toBe('r1')

      expect(mockPrisma.userProjectRole.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_projectId: { userId: 'u1', projectId: 'p1' } },
        }),
      )
    })

    it('should reject duplicate user-project assignment', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({
        id: 'existing',
        userId: 'u1',
        projectId: 'p1',
        deletedAt: null,
      })

      await expect(
        assignUserToProject('u1', 'p1', 'r2'),
      ).rejects.toThrow(/already assigned/i)
    })

    it('should reactivate deleted assignment', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({
        id: 'upr1',
        userId: 'u1',
        projectId: 'p1',
        deletedAt: new Date(),
      })
      mockPrisma.userProjectRole.update.mockResolvedValue({
        id: 'upr1',
        deletedAt: null,
      })

      await assignUserToProject('u1', 'p1', 'r1')
      expect(mockPrisma.userProjectRole.update).toHaveBeenCalled()
    })
  })
})
