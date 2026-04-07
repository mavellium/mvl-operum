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
    it('should create permission with recurso and acao', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({
        id: 'p1',
        nome: 'cards:create',
        recurso: 'cards',
        acao: 'create',
        descricao: null,
        deletedAt: null,
      })

      const perm = await create({
        nome: 'cards:create',
        recurso: 'cards',
        acao: 'create',
      })
      expect(perm.recurso).toBe('cards')
      expect(perm.acao).toBe('create')
    })

    it('should accept optional descricao', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)
      mockPrisma.permission.create.mockResolvedValue({
        id: 'p1',
        nome: 'cards:read',
        recurso: 'cards',
        acao: 'read',
        descricao: 'Read cards',
        deletedAt: null,
      })

      const perm = await create({
        nome: 'cards:read',
        recurso: 'cards',
        acao: 'read',
        descricao: 'Read cards',
      })
      expect(perm.descricao).toBe('Read cards')
    })

    it('should reject duplicate permission (nome)', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        create({
          nome: 'cards:create',
          recurso: 'cards',
          acao: 'create',
        }),
      ).rejects.toThrow(/já existe/i)
    })

    it('should reject duplicate recurso:acao', async () => {
      mockPrisma.permission.findUnique.mockResolvedValueOnce(null)
      mockPrisma.permission.findUnique.mockResolvedValueOnce({ id: 'existing' })

      await expect(
        create({
          nome: 'cards:write',
          recurso: 'cards',
          acao: 'create',
        }),
      ).rejects.toThrow(/já existe/i)
    })
  })

  describe('findAll', () => {
    it('should return all active permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p1', nome: 'cards:read' },
        { id: 'p2', nome: 'cards:create' },
      ])

      const perms = await findAll()
      expect(perms).toHaveLength(2)
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })

    it('should support filtering by recurso', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([])

      await findAll({ recurso: 'cards' })
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recurso: 'cards' }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return permission by id', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({
        id: 'p1',
        nome: 'cards:read',
        recurso: 'cards',
        acao: 'read',
      })

      const perm = await findById('p1')
      expect(perm?.nome).toBe('cards:read')
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
        { id: 'p1', nome: 'cards:read' },
        { id: 'p2', nome: 'cards:create' },
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
