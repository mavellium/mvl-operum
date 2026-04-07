// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    projeto: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    usuarioProjeto: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createProjeto,
  findAllByTenant,
  findById,
  updateProjeto,
  addMember,
  removeMember,
} from '@/services/projetoService'

const mockPrisma = prisma as {
  projeto: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  usuarioProjeto: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProjetoService', () => {
  describe('createProjeto', () => {
    it('should create projeto linked to tenant', async () => {
      mockPrisma.projeto.findFirst.mockResolvedValue(null)
      mockPrisma.projeto.create.mockResolvedValue({
        id: 'p1',
        nome: 'Projeto Alpha',
        tenantId: 'tenant-1',
        descricao: null,
        status: 'ATIVO',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const projeto = await createProjeto({ nome: 'Projeto Alpha', tenantId: 'tenant-1' })
      expect(projeto.nome).toBe('Projeto Alpha')
      expect(projeto.tenantId).toBe('tenant-1')
      expect(projeto.status).toBe('ATIVO')
    })

    it('should reject duplicate nome within same tenant', async () => {
      mockPrisma.projeto.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createProjeto({ nome: 'Projeto Alpha', tenantId: 'tenant-1' }),
      ).rejects.toThrow(/já existe/i)
    })

    it('should allow same nome in different tenants', async () => {
      mockPrisma.projeto.findFirst.mockResolvedValue(null)
      mockPrisma.projeto.create.mockResolvedValue({
        id: 'p2',
        nome: 'Projeto Alpha',
        tenantId: 'tenant-2',
        status: 'ATIVO',
        deletedAt: null,
      })

      const projeto = await createProjeto({ nome: 'Projeto Alpha', tenantId: 'tenant-2' })
      expect(projeto.tenantId).toBe('tenant-2')
    })

    it('should set default status ATIVO', async () => {
      mockPrisma.projeto.findFirst.mockResolvedValue(null)
      mockPrisma.projeto.create.mockResolvedValue({
        id: 'p1',
        nome: 'Test',
        tenantId: 't1',
        status: 'ATIVO',
        deletedAt: null,
      })

      const projeto = await createProjeto({ nome: 'Test', tenantId: 't1' })
      expect(projeto.status).toBe('ATIVO')
    })

    it('should reject invalid input (empty nome)', async () => {
      await expect(
        createProjeto({ nome: '', tenantId: 'tenant-1' }),
      ).rejects.toThrow()
    })
  })

  describe('findAllByTenant', () => {
    it('should return only projetos from given tenant', async () => {
      mockPrisma.projeto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'Proj A', tenantId: 'tenant-1' },
        { id: 'p2', nome: 'Proj B', tenantId: 'tenant-1' },
      ])

      const projetos = await findAllByTenant('tenant-1')
      expect(projetos).toHaveLength(2)
      expect(mockPrisma.projeto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: null }),
        }),
      )
    })

    it('should not return soft-deleted projetos', async () => {
      mockPrisma.projeto.findMany.mockResolvedValue([])

      await findAllByTenant('tenant-1')
      expect(mockPrisma.projeto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('findById', () => {
    it('should return projeto with sprint count', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        id: 'p1',
        nome: 'Proj A',
        _count: { sprints: 3 },
      })

      const projeto = await findById('p1')
      expect(projeto).toMatchObject({ id: 'p1', nome: 'Proj A' })
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(null)

      const projeto = await findById('nonexistent')
      expect(projeto).toBeNull()
    })
  })

  describe('updateProjeto', () => {
    it('should update nome and descricao', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        id: 'p1',
        nome: 'Old',
        status: 'ATIVO',
        deletedAt: null,
      })
      mockPrisma.projeto.update.mockResolvedValue({
        id: 'p1',
        nome: 'New Name',
        descricao: 'New desc',
      })

      const projeto = await updateProjeto('p1', { nome: 'New Name', descricao: 'New desc' })
      expect(projeto.nome).toBe('New Name')
    })

    it('should reject updates on CONCLUIDO projects', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        id: 'p1',
        nome: 'Done',
        status: 'CONCLUIDO',
        deletedAt: null,
      })

      await expect(
        updateProjeto('p1', { nome: 'Updated' }),
      ).rejects.toThrow(/concluído|arquivado/i)
    })

    it('should reject updates on ARQUIVADO projects', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        id: 'p1',
        nome: 'Archived',
        status: 'ARQUIVADO',
        deletedAt: null,
      })

      await expect(
        updateProjeto('p1', { nome: 'Updated' }),
      ).rejects.toThrow(/concluído|arquivado/i)
    })

    it('should reject update on non-existent project', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(null)

      await expect(
        updateProjeto('nonexistent', { nome: 'Updated' }),
      ).rejects.toThrow(/não encontrado/i)
    })
  })

  describe('addMember', () => {
    it('should create UsuarioProjeto link', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue(null)
      mockPrisma.usuarioProjeto.create.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataEntrada: new Date(),
        dataSaida: null,
      })

      const link = await addMember('p1', 'u1')
      expect(link.userId).toBe('u1')
      expect(link.projetoId).toBe('p1')
    })

    it('should reject duplicate user-project association', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataSaida: null,
      })

      await expect(addMember('p1', 'u1')).rejects.toThrow(/já é membro/i)
    })

    it('should set dataEntrada to current date', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue(null)
      const now = new Date()
      mockPrisma.usuarioProjeto.create.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataEntrada: now,
        dataSaida: null,
      })

      const link = await addMember('p1', 'u1')
      expect(link.dataEntrada).toBeDefined()
    })
  })

  describe('removeMember', () => {
    it('should set dataSaida on UsuarioProjeto', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataSaida: null,
      })
      mockPrisma.usuarioProjeto.update.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataSaida: new Date(),
      })

      const link = await removeMember('p1', 'u1')
      expect(link.dataSaida).toBeDefined()
    })

    it('should not hard delete the association', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue({
        id: 'up1',
        userId: 'u1',
        projetoId: 'p1',
        dataSaida: null,
      })
      mockPrisma.usuarioProjeto.update.mockResolvedValue({
        id: 'up1',
        dataSaida: new Date(),
      })

      await removeMember('p1', 'u1')
      expect(mockPrisma.usuarioProjeto.update).toHaveBeenCalled()
    })

    it('should throw if member not found', async () => {
      mockPrisma.usuarioProjeto.findUnique.mockResolvedValue(null)

      await expect(removeMember('p1', 'u1')).rejects.toThrow(/não encontrado/i)
    })
  })
})
