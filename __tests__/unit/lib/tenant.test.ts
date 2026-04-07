// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/tenantService', () => ({
  getDefaultTenant: vi.fn(),
  getTenantBySubdominio: vi.fn(),
}))

import { getDefaultTenant, getTenantBySubdominio } from '@/services/tenantService'
import { resolveTenantId } from '@/lib/tenant'

const mockGetDefault = getDefaultTenant as ReturnType<typeof vi.fn>
const mockGetBySubdominio = getTenantBySubdominio as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveTenantId', () => {
  it('should return default tenant id when no subdomain provided', async () => {
    mockGetDefault.mockResolvedValue({ id: 't-default', subdominio: 'default' })

    const tenantId = await resolveTenantId()
    expect(tenantId).toBe('t-default')
    expect(mockGetDefault).toHaveBeenCalled()
  })

  it('should resolve tenant from subdomain when provided', async () => {
    mockGetBySubdominio.mockResolvedValue({ id: 't-acme', subdominio: 'acme' })

    const tenantId = await resolveTenantId('acme')
    expect(tenantId).toBe('t-acme')
    expect(mockGetBySubdominio).toHaveBeenCalledWith('acme')
  })

  it('should throw when subdomain tenant not found', async () => {
    mockGetBySubdominio.mockResolvedValue(null)

    await expect(resolveTenantId('nonexistent')).rejects.toThrow(/tenant/i)
  })

  it('should throw when no default tenant exists', async () => {
    mockGetDefault.mockResolvedValue(null)

    await expect(resolveTenantId()).rejects.toThrow(/tenant/i)
  })
})
