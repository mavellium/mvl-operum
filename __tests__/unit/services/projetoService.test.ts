// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const mockPrismaInner = {
    project: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userProject: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(mockPrismaInner)),
  }
  return { default: mockPrismaInner }
})

vi.mock('@/services/projectRoleService', () => ({
  setProjectManagerRole: vi.fn(),
  removeProjectRole: vi.fn(),
  isProjectManager: vi.fn().mockResolvedValue(false),
  countProjectManagers: vi.fn().mockResolvedValue(2),
}))

import prisma from '@/lib/prisma'
import {
  createProject,
  findAllByTenant,
  findById,
  updateProject,
  addMember,
  removeMember,
} from '@/services/projetoService'

const mockPrisma = prisma as {
  project: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  userProject: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProjetoService', () => {
  describe('createProject', () => {
    it('should create project linked to tenant', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null)
      mockPrisma.project.create.mockResolvedValue({
        id: 'p1',
        name: 'Projeto Alpha',
        tenantId: 'tenant-1',
        description: null,
        status: 'ACTIVE',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const projeto = await createProject({ name: 'Projeto Alpha', tenantId: 'tenant-1' })
      expect(projeto.name).toBe('Projeto Alpha')
      expect(projeto.tenantId).toBe('tenant-1')
      expect(projeto.status).toBe('ACTIVE')
    })

    it('should reject duplicate name within same tenant', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createProject({ name: 'Projeto Alpha', tenantId: 'tenant-1' }),
      ).rejects.toThrow()
    })

    it('should allow same name in different tenants', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null)
      mockPrisma.project.create.mockResolvedValue({
        id: 'p2',
        name: 'Projeto Alpha',
        tenantId: 'tenant-2',
        status: 'ACTIVE',
        deletedAt: null,
      })

      const projeto = await createProject({ name: 'Projeto Alpha', tenantId: 'tenant-2' })
      expect(projeto.tenantId).toBe('tenant-2')
    })

    it('should set default status ACTIVE', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null)
      mockPrisma.project.create.mockResolvedValue({
        id: 'p1',
        name: 'Test',
        tenantId: 't1',
        status: 'ACTIVE',
        deletedAt: null,
      })

      const projeto = await createProject({ name: 'Test', tenantId: 't1' })
      expect(projeto.status).toBe('ACTIVE')
    })

    it('should reject invalid input (empty name)', async () => {
      await expect(
        createProject({ name: '', tenantId: 'tenant-1' }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByTenant', () => {
    it('should return only projects from given tenant', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { id: 'p1', name: 'Proj A', tenantId: 'tenant-1' },
        { id: 'p2', name: 'Proj B', tenantId: 'tenant-1' },
      ])

      const projetos = await findAllByTenant('tenant-1')
      expect(projetos).toHaveLength(2)
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: null }),
        }),
      )
    })

    it('should not return soft-deleted projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([])

      await findAllByTenant('tenant-1')
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return project with sprint count', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Proj A',
        _count: { sprints: 3 },
      })

      const projeto = await findById('p1')
      expect(projeto).toMatchObject({ id: 'p1', name: 'Proj A' })
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const projeto = await findById('nonexistent')
      expect(projeto).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update name and description', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Old',
        status: 'ACTIVE',
        deletedAt: null,
      })
      mockPrisma.project.update.mockResolvedValue({
        id: 'p1',
        name: 'New Name',
        description: 'New desc',
      })

      const projeto = await updateProject('p1', { name: 'New Name', description: 'New desc' })
      expect(projeto.name).toBe('New Name')
    })

    it('should reject updates on COMPLETED projects', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Done',
        status: 'COMPLETED',
        deletedAt: null,
      })

      await expect(
        updateProject('p1', { name: 'Updated' }),
      ).rejects.toThrow(/completed|archived/i)
    })

    it('should reject updates on ARCHIVED projects', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Archived',
        status: 'ARCHIVED',
        deletedAt: null,
      })

      await expect(
        updateProject('p1', { name: 'Updated' }),
      ).rejects.toThrow(/completed|archived/i)
    })

    it('should reject update on non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      await expect(
        updateProject('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(/not found/i)
    })
  })

  describe('addMember', () => {
    it('should create UserProject link', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue(null)
      mockPrisma.userProject.create.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        startDate: new Date(),
        endDate: null,
      })

      const link = await addMember('p1', 'u1')
      expect(link.userId).toBe('u1')
      expect(link.projectId).toBe('p1')
    })

    it('should reject duplicate active user-project association', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        active: true,
        endDate: null,
      })

      await expect(addMember('p1', 'u1')).rejects.toThrow()
    })

    it('should set startDate to current date', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue(null)
      const now = new Date()
      mockPrisma.userProject.create.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        startDate: now,
        endDate: null,
      })

      const link = await addMember('p1', 'u1')
      expect(link.startDate).toBeDefined()
    })
  })

  describe('removeMember', () => {
    it('should set endDate on UserProject', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        endDate: null,
      })
      mockPrisma.userProject.update.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        endDate: new Date(),
      })

      const link = await removeMember('p1', 'u1')
      expect(link.endDate).toBeDefined()
    })

    it('should not hard delete the association', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projectId: 'p1',
        endDate: null,
      })
      mockPrisma.userProject.update.mockResolvedValue({
        id: 'up1',
        endDate: new Date(),
      })

      await removeMember('p1', 'u1')
      expect(mockPrisma.userProject.update).toHaveBeenCalled()
    })

    it('should throw if member not found', async () => {
      mockPrisma.userProject.findUnique.mockResolvedValue(null)

      await expect(removeMember('p1', 'u1')).rejects.toThrow(/not found/i)
    })
  })
})
