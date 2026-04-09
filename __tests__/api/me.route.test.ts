// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'


vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
  }
  return { default: mockPrisma, prisma: mockPrisma }
})



import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import { GET } from '@/app/api/me/route'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>
const mockUserFindUnique = (prisma as unknown as { user: { findUnique: ReturnType<typeof vi.fn> } }).user.findUnique;

function makeRequest(cookie?: string) {
  return new Request('http://localhost/api/me', {
    headers: cookie ? { cookie } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/me', () => {
  it('returns 200 with user data when JWT valid and user exists in DB', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    mockUserFindUnique.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member', tokenVersion: 0 })

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
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('returns 401 when user no longer exists in DB', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    mockUserFindUnique.mockResolvedValue(null)

    const res = await GET(makeRequest('session=valid-token') as never)
    expect(res.status).toBe(401)
  })

  it('returns 401 when tokenVersion in JWT differs from DB', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tokenVersion: 0 })
    mockUserFindUnique.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member', tokenVersion: 1 })

    const res = await GET(makeRequest('session=valid-token') as never)
    expect(res.status).toBe(401)
  })
})
