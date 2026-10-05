// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/session', () => ({ decrypt: vi.fn() }))
vi.mock('@/lib/authClient', () => ({ authServiceVerify: vi.fn() }))
import { decrypt } from '@/lib/session'
import { authServiceVerify } from '@/lib/authClient'
import { validatedSession } from '@/lib/validatedSession'
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })
describe('production BFF revocation', () => {
  it('rejects a valid signature with revoked authority proof and uses current role', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.mocked(decrypt).mockResolvedValue({ userId: 'u', tenantId: 't', jti: 'j', role: 'admin', expiresAt: new Date() })
    vi.mocked(authServiceVerify).mockResolvedValue(null)
    expect(await validatedSession('token')).toBeNull()
    vi.mocked(authServiceVerify).mockResolvedValue({ userId: 'u', tenantId: 't', role: 'member' })
    expect(await validatedSession('token')).toMatchObject({ role: 'member' })
    vi.mocked(authServiceVerify).mockRejectedValue(new Error('unavailable'))
    await expect(validatedSession('token')).rejects.toThrow('unavailable')
  })
})
