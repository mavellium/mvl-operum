// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    permission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { create, findAll, findById, findByRole, deletePermission } from '@/services/permissionService'

const mockPrisma = prisma as {
  permission: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PermissionService', () => {
  describe('create', () => {
    it('should create permission with resource and action', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({
        id: 'p1',
        name: 'cards:create',
        resource: 'cards',
        action:'create',
        description: null,
        deletedAt: null,
      })

      const perm = await create({
        name: 'cards:create',
        resource: 'cards',
        action:'create',
      })
      expect(perm.resource).toBe('cards')
      expect(perm.action).toBe('create')
    })

    it('should accept optional description', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({
        id: 'p1',
        name: 'cards:read',
        resource: 'cards',
        action:'read',
        description: 'Read cards',
        deletedAt: null,
      })

      const perm = await create({
        name: 'cards:read',
        resource: 'cards',
        action:'read',
        description: 'Read cards',
      })
      expect(perm.description).toBe('Read cards')
    })

    it('should reject duplicate permission (name)', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        create({
          name: 'cards:create',
          resource: 'cards',
          action:'create',
        }),
      ).rejects.toThrow(/já existe/i)
    })

    it('should reject duplicate resource:action', async () => {
      mockPrisma.permission.findUnique.mockResolvedValueOnce(null)
      mockPrisma.permission.findUnique.mockResolvedValueOnce({ id: 'existing' })

      await expect(
        create({
          name: 'cards:write',
          resource: 'cards',
          action:'create',
        }),
      ).rejects.toThrow(/já existe/i)
    })
  })

  describe('findAll', () => {
    it('should return all active permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', name: 'cards:read' },
        { id: 'p2', name: 'cards:create' },
      ])

      const perms = await findAll()
      expect(perms).toHaveLength(2)
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should support filtering by resource', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([])

      await findAll({ resource: 'cards' })
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resource: 'cards' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return permission by id', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'cards:read',
        resource: 'cards',
        action:'read',
      })

      const perm = await findById('p1')
      expect(perm?.name).toBe('cards:read')
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)

      const perm = await findById('nonexistent')
      expect(perm).toBeNull()
    })
  })

  describe('findByRole', () => {
    it('should return permissions assigned to role', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', name: 'cards:read' },
        { id: 'p2', name: 'cards:create' },
      ])

      const perms = await findByRole('r1')
      expect(perms).toHaveLength(2)
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roles: expect.objectContaining({ some: { roleId: 'r1' } }),
          }),
        }),
      )
    })

    it('should return empty array if role has no permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([])

      const perms = await findByRole('r-empty')
      expect(perms).toHaveLength(0)
    })
  })

  describe('deletePermission', () => {
    it('should soft delete permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      })
      mockPrisma.permission.update.mockResolvedValue({
        id: 'p1',
        deletedAt: expect.any(Date),
      })

      await deletePermission('p1')
      expect(mockPrisma.permission.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should throw if permission not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)

      await expect(deletePermission('nonexistent')).rejects.toThrow(/não encontrad/i)
    })
  })
})
