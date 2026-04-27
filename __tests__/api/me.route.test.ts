// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))
vi.mock('@/lib/api-client', () => ({
  authApi: {
    me: vi.fn(),
  },
  projectsApi: {
    getUserProjects: vi.fn(),
  },
}))

import { decrypt } from '@/lib/session'
import { authApi, projectsApi } from '@/lib/api-client'
import { GET } from '@/app/api/me/route'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>

function makeRequest(cookie?: string) {
  return new Request('http://localhost/api/me', {
    headers: cookie ? { cookie } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(projectsApi.getUserProjects).mockResolvedValue([])
})

describe('GET /api/me', () => {
  it('returns 200 with user data when JWT valid and user exists in DB', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member',
      isActive: true, forcePasswordChange: false,
    })

    const res = await GET(makeRequest('session=valid-token') as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.id).toBe('u1')
    expect(data.user.name).toBe('Ana')
  })

  it('returns 401 when no session cookie', async () => {
    mockDecrypt.mockResolvedValue(null)

    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(401)
  })

  it('returns 401 when JWT is invalid or tampered', async () => {
    mockDecrypt.mockResolvedValue(null)

    const res = await GET(makeRequest('session=tampered-token') as never)
    expect(res.status).toBe(401)
    expect(authApi.me).not.toHaveBeenCalled()
  })

  it('returns 401 when user no longer exists or API fails', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'))

    const res = await GET(makeRequest('session=valid-token') as never)
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is inactive', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member',
      isActive: false, forcePasswordChange: false,
    })

    const res = await GET(makeRequest('session=valid-token') as never)
    expect(res.status).toBe(401)
  })
})
