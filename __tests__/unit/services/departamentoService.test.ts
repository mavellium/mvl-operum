// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    departamento: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    usuarioDepartamento: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createDepartamento,
  findAllByTenant,
  updateDepartamento,
  deactivate,
  associateUser,
  dissociateUser,
} from '@/services/departamentoService'

const mockPrisma = prisma as {
  departamento: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  usuarioDepartamento: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DepartamentoService', () => {
  describe('createDepartamento', () => {
    it('should create departamento linked to tenant', async () => {
      mockPrisma.departamento.findFirst.mockResolvedValue(null)
      mockPrisma.departamento.create.mockResolvedValue({
        id: 'd1',
        nome: 'Engenharia',
        tenantId: 'tenant-1',
        descricao: null,
        ativo: true,
        valorHora: null,
        deletedAt: null,
      })

      const dept = await createDepartamento({ nome: 'Engenharia', tenantId: 'tenant-1' })
      expect(dept.nome).toBe('Engenharia')
      expect(dept.tenantId).toBe('tenant-1')
      expect(dept.ativo).toBe(true)
    })

    it('should reject duplicate nome within tenant', async () => {
      mockPrisma.departamento.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        createDepartamento({ nome: 'Engenharia', tenantId: 'tenant-1' }),
      ).rejects.toThrow(/já existe/i)
    })

    it('should reject invalid input (empty nome)', async () => {
      await expect(
        createDepartamento({ nome: '', tenantId: 'tenant-1' }),
      ).rejects.toThrow()
    })

    it('should accept optional valorHora', async () => {
      mockPrisma.departamento.findFirst.mockResolvedValue(null)
      mockPrisma.departamento.create.mockResolvedValue({
        id: 'd1',
        nome: 'Engenharia',
        tenantId: 'tenant-1',
        valorHora: 150.0,
        ativo: true,
      })

      const dept = await createDepartamento({ nome: 'Engenharia', tenantId: 'tenant-1', valorHora: 150.0 })
      expect(dept.valorHora).toBe(150.0)
    })
  })

  describe('findAllByTenant', () => {
    it('should return departamentos filtered by tenant', async () => {
      mockPrisma.departamento.findMany.mockResolvedValue([
        { id: 'd1', nome: 'Eng', tenantId: 'tenant-1' },
      ])

      const depts = await findAllByTenant('tenant-1')
      expect(depts).toHaveLength(1)
      expect(mockPrisma.departamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: null }),
        }),
      )
    })
  })

  describe('updateDepartamento', () => {
    it('should update departamento nome', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue({
        id: 'd1',
        nome: 'Old',
        ativo: true,
        deletedAt: null,
      })
      mockPrisma.departamento.update.mockResolvedValue({
        id: 'd1',
        nome: 'New Name',
      })

      const dept = await updateDepartamento('d1', { nome: 'New Name' })
      expect(dept.nome).toBe('New Name')
    })

    it('should throw if departamento not found', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue(null)

      await expect(
        updateDepartamento('nonexistent', { nome: 'Test' }),
      ).rejects.toThrow(/não encontrado/i)
    })
  })

  describe('deactivate', () => {
    it('should set ativo = false', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue({
        id: 'd1',
        ativo: true,
        deletedAt: null,
      })
      mockPrisma.usuarioDepartamento.findMany.mockResolvedValue([])
      mockPrisma.departamento.update.mockResolvedValue({
        id: 'd1',
        ativo: false,
      })

      const dept = await deactivate('d1')
      expect(dept.ativo).toBe(false)
    })

    it('should reject if users still associated', async () => {
      mockPrisma.departamento.findUnique.mockResolvedValue({
        id: 'd1',
        ativo: true,
        deletedAt: null,
      })
      mockPrisma.usuarioDepartamento.findMany.mockResolvedValue([
        { id: 'ud1', userId: 'u1' },
      ])

      await expect(deactivate('d1')).rejects.toThrow(/usuários associados/i)
    })
  })

  describe('associateUser', () => {
    it('should create UsuarioDepartamento link', async () => {
      mockPrisma.usuarioDepartamento.findUnique.mockResolvedValue(null)
      mockPrisma.usuarioDepartamento.create.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departamentoId: 'd1',
      })

      const link = await associateUser('d1', 'u1')
      expect(link.userId).toBe('u1')
      expect(link.departamentoId).toBe('d1')
    })

    it('should reject duplicate user-departamento', async () => {
      mockPrisma.usuarioDepartamento.findUnique.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departamentoId: 'd1',
      })

      await expect(associateUser('d1', 'u1')).rejects.toThrow(/já está associado/i)
    })
  })

  describe('dissociateUser', () => {
    it('should remove UsuarioDepartamento link', async () => {
      mockPrisma.usuarioDepartamento.findUnique.mockResolvedValue({
        id: 'ud1',
        userId: 'u1',
        departamentoId: 'd1',
      })
      mockPrisma.usuarioDepartamento.delete.mockResolvedValue({
        id: 'ud1',
      })

      await dissociateUser('d1', 'u1')
      expect(mockPrisma.usuarioDepartamento.delete).toHaveBeenCalled()
    })

    it('should throw if association not found', async () => {
      mockPrisma.usuarioDepartamento.findUnique.mockResolvedValue(null)

      await expect(dissociateUser('d1', 'u1')).rejects.toThrow(/não encontrad/i)
    })
  })
})
