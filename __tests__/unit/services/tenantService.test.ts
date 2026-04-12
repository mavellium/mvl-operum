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
  getTenantBySubdomain,
  getTenantById,
  getDefaultTenant,
  updateTenant,
} from '@/services/tenantService'

const mockPrisma = prisma as unknown as {
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
    it('should create tenant with status ACTIVE', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)
      mockPrisma.tenant.create.mockResolvedValue({
        id: 't1',
        name: 'ACME',
        subdomain: 'acme',
        status: 'ACTIVE',
        config: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const tenant = await createTenant({ name: 'ACME', subdomain: 'acme' })
      expect(tenant.status).toBe('ACTIVE')
      expect(tenant.name).toBe('ACME')
      expect(tenant.subdomain).toBe('acme')
    })

    it('should reject duplicate subdomain', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        createTenant({ name: 'ACME', subdomain: 'acme' }),
      ).rejects.toThrow(/subdomínio/i)
    })

    it('should reject invalid input (empty name)', async () => {
      await expect(
        createTenant({ name: '', subdomain: 'acme' }),
      ).rejects.toThrow()
    })

    it('should reject invalid subdomain (too short)', async () => {
      await expect(
        createTenant({ name: 'ACME', subdomain: 'ab' }),
      ).rejects.toThrow()
    })
  })

  describe('getTenantBysubdomain', () => {
    it('should return tenant by subdomain', async () => {
      const mockTenant = {
        id: 't1',
        name: 'ACME',
        subdomain: 'acme',
        status: 'ACTIVE',
        deletedAt: null,
      }
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const tenant = await getTenantBySubdomain('acme')
      expect(tenant).toMatchObject({ id: 't1', subdomain: 'acme' })
    })

    it('should return null for non-existent subdomain', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const tenant = await getTenantBySubdomain('nonexistent')
      expect(tenant).toBeNull()
    })

    it('should not return tenants with deletedAt set', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null) // query includes deletedAt: null

      const tenant = await getTenantBySubdomain('deleted-tenant')
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
      const mockTenant = { id: 't1', name: 'ACME', subdomain: 'acme' }
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
    it('should return the default tenant (subdomain = "default")', async () => {
      const mockTenant = { id: 't-default', name: 'Default', subdomain: 'default' }
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const tenant = await getDefaultTenant()
      expect(tenant).toMatchObject({ subdomain: 'default' })
    })

    it('should return null when no default tenant exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      const tenant = await getDefaultTenant()
      expect(tenant).toBeNull()
    })
  })

  describe('updateTenant', () => {
    it('should update tenant name', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: 't1',
        name: 'New Name',
        subdomain: 'acme',
        status: 'ACTIVE',
      })

      const tenant = await updateTenant('t1', { name: 'New Name' })
      expect(tenant.name).toBe('New Name')
    })

    it('should update tenant status', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: 't1',
        name: 'ACME',
        subdomain: 'acme',
        status: 'INACTIVE',
      })

      const tenant = await updateTenant('t1', { status: 'INACTIVE' })
      expect(tenant.status).toBe('INACTIVE')
    })

    it('should reject invalid status', async () => {
      await expect(
        updateTenant('t1', { status: 'INVALID' as 'ACTIVE' }),
      ).rejects.toThrow()
    })
  })
})
