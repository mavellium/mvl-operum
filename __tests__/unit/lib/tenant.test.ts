// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/tenantService', () => ({
  getDefaultTenant: vi.fn(),
  getTenantBysubdomain: vi.fn(),
}))

import { getDefaultTenant, getTenantBySubdomain } from '@/services/tenantService'
import { resolveTenantId } from '@/lib/tenant'

const mockGetDefault = getDefaultTenant as ReturnType<typeof vi.fn>
const mockGetBysubdomain = getTenantBySubdomain as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveTenantId', () => {
  it('should return default tenant id when no subdomain provided', async () => {
    mockGetDefault.mockResolvedValue({ id: 't-default', subdomain: 'default' })

    const tenantId = await resolveTenantId()
    expect(tenantId).toBe('t-default')
    expect(mockGetDefault).toHaveBeenCalled()
  })

  it('should resolve tenant from subdomain when provided', async () => {
    mockGetBysubdomain.mockResolvedValue({ id: 't-acme', subdomain: 'acme' })

    const tenantId = await resolveTenantId('acme')
    expect(tenantId).toBe('t-acme')
    expect(mockGetBysubdomain).toHaveBeenCalledWith('acme')
  })

  it('should throw when subdomain tenant not found', async () => {
    mockGetBysubdomain.mockResolvedValue(null)

    await expect(resolveTenantId('nonexistent')).rejects.toThrow(/tenant/i)
  })

  it('should throw when no default tenant exists', async () => {
    mockGetDefault.mockResolvedValue(null)

    await expect(resolveTenantId()).rejects.toThrow(/tenant/i)
  })
})
