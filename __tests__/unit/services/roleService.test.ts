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
      create: vi.fn(),
      update: vi.fn(),
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
  assignPermission,
  removePermission,
  assignUserToProject,
} from '@/services/roleService'

const mockPrisma = prisma as {
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
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
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
        nome: 'Admin',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
        descricao: null,
        deletedAt: null,
      })

      const role = await createRole({
        nome: 'Admin',
        tenantId: 'tenant-1',
        escopo: 'TENANT',
      })
      expect(role.nome).toBe('Admin')
      expect(role.escopo).toBe('TENANT')
    })

    it('should create role with PROJETO scope', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null)
      mockPrisma.role.create.mockResolvedValue({
        id: 'r2',
        nome: 'Project Admin',
        tenantId: 'tenant-1',
        escopo: 'PROJETO',
        descricao: null,
        deletedAt: null,
      })

      const role = await createRole({
        nome: 'Project Admin',
        tenantId: 'tenant-1',
        escopo: 'PROJETO',
      })
      expect(role.escopo).toBe('PROJETO')
    })

    it('should reject duplicate role name in tenant with same scope', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createRole({
          nome: 'Admin',
          tenantId: 'tenant-1',
          escopo: 'TENANT',
        }),
      ).rejects.toThrow(/já existe/i)
    })
  })

  describe('findAllByTenant', () => {
    it('should return roles for tenant', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', nome: 'Admin' },
        { id: 'r2', nome: 'Member' },
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
          where: expect.objectContaining({ escopo: 'TENANT' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return role with permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        nome: 'Admin',
        permissoes: [{ permission: { nome: 'read_cards' } }],
      })

      const role = await findById('r1')
      expect(role?.nome).toBe('Admin')
    })

    it('should return null for deleted role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null)

      const role = await findById('r-deleted')
      expect(role).toBeNull()
    })
  })

  describe('updateRole', () => {
    it('should update role nome', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        nome: 'Old',
        deletedAt: null,
      })
      mockPrisma.role.update.mockResolvedValue({
        id: 'r1',
        nome: 'New Name',
      })

      const role = await updateRole('r1', { nome: 'New Name' })
      expect(role.nome).toBe('New Name')
    })

    it('should throw if role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null)

      await expect(
        updateRole('nonexistent', { nome: 'Updated' }),
      ).rejects.toThrow(/não encontrad/i)
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
      ).rejects.toThrow(/já tem essa permissão/i)
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
      ).rejects.toThrow(/não encontrad/i)
    })
  })

  describe('assignUserToProject', () => {
    it('should create UserProjectRole link', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null)
      mockPrisma.userProjectRole.create.mockResolvedValue({
        id: 'upr1',
        userId: 'u1',
        projetoId: 'p1',
        roleId: 'r1',
      })

      const link = await assignUserToProject('u1', 'p1', 'r1')
      expect(link.userId).toBe('u1')
      expect(link.roleId).toBe('r1')
    })

    it('should reject duplicate user-project assignment', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({
        id: 'existing',
        userId: 'u1',
        projetoId: 'p1',
        deletedAt: null,
      })

      await expect(
        assignUserToProject('u1', 'p1', 'r2'),
      ).rejects.toThrow(/já atribuído/i)
    })

    it('should reactivate deleted assignment', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({
        id: 'upr1',
        userId: 'u1',
        projetoId: 'p1',
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
