// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createTenant,
  getTenantBySubdominio,
  getTenantById,
  getDefaultTenant,
  updateTenant,
} from '@/services/tenantService'

const mockPrisma = prisma as {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TenantService', () => {
  describe('createTenant', () => {
    it('should create tenant with status ATIVO', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)
      mockPrisma.tenant.create.mockResolvedValue({
        id: 't1',
        nome: 'ACME',
        subdominio: 'acme',
        status: 'ATIVO',
        config: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const tenant = await createTenant({ nome: 'ACME', subdominio: 'acme' })
      expect(tenant.status).toBe('ATIVO')
      expect(tenant.nome).toBe('ACME')
      expect(tenant.subdominio).toBe('acme')
    })

    it('should reject duplicate subdominio', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        createTenant({ nome: 'ACME', subdominio: 'acme' }),
      ).rejects.toThrow(/subdomínio/i)
    })

    it('should reject invalid input (empty nome)', async () => {
      await expect(
        createTenant({ nome: '', subdominio: 'acme' }),
      ).rejects.toThrow()
    })

    it('should reject invalid subdominio (too short)', async () => {
      await expect(
        createTenant({ nome: 'ACME', subdominio: 'ab' }),
      ).rejects.toThrow()
    })
  })

  describe('getTenantBySubdominio', () => {
    it('should return tenant by subdominio', async () => {
      const mockTenant = {
        id: 't1',
        nome: 'ACME',
        subdominio: 'acme',
        status: 'ATIVO',
        deletedAt: null,
      }
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const tenant = await getTenantBySubdominio('acme')
      expect(tenant).toMatchObject({ id: 't1', subdominio: 'acme' })
    })

    it('should return null for non-existent subdominio', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const tenant = await getTenantBySubdominio('nonexistent')
      expect(tenant).toBeNull()
    })

    it('should not return tenants with deletedAt set', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null) // query includes deletedAt: null

      const tenant = await getTenantBySubdominio('deleted-tenant')
      expect(tenant).toBeNull()
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      )
    })
  })

  describe('getTenantById', () => {
    it('should return tenant by id', async () => {
      const mockTenant = { id: 't1', nome: 'ACME', subdominio: 'acme' }
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const tenant = await getTenantById('t1')
      expect(tenant).toMatchObject({ id: 't1' })
    })

    it('should return null for non-existent id', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const tenant = await getTenantById('nonexistent')
      expect(tenant).toBeNull()
    })
  })

  describe('getDefaultTenant', () => {
    it('should return the default tenant (subdominio = "default")', async () => {
      const mockTenant = { id: 't-default', nome: 'Default', subdominio: 'default' }
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const tenant = await getDefaultTenant()
      expect(tenant).toMatchObject({ subdominio: 'default' })
    })

    it('should return null when no default tenant exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const tenant = await getDefaultTenant()
      expect(tenant).toBeNull()
    })
  })

  describe('updateTenant', () => {
    it('should update tenant nome', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: 't1',
        nome: 'New Name',
        subdominio: 'acme',
        status: 'ATIVO',
      })

      const tenant = await updateTenant('t1', { nome: 'New Name' })
      expect(tenant.nome).toBe('New Name')
    })

    it('should update tenant status', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: 't1',
        nome: 'ACME',
        subdominio: 'acme',
        status: 'INATIVO',
      })

      const tenant = await updateTenant('t1', { status: 'INATIVO' })
      expect(tenant.status).toBe('INATIVO')
    })

    it('should reject invalid status', async () => {
      await expect(
        updateTenant('t1', { status: 'INVALID' as 'ATIVO' }),
      ).rejects.toThrow()
    })
  })
})
