// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({
  verifyRouteSession: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    card: { findMany: vi.fn() },
  },
}))

import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import { verifyRouteSession } from '@/lib/routeAuth'
import { GET } from '@/app/api/search/route'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>
const mockVerifyRoute = verifyRouteSession as ReturnType<typeof vi.fn>
const mockPrisma = prisma as { card: { findMany: ReturnType<typeof vi.fn> } }

const makeRequest = (q: string, cookie = 'session=valid-token') =>
  new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}`, {
    headers: { cookie },
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyRoute.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
  mockDecrypt.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
})

describe('GET /api/search', () => {
  it('returns 401 if not authenticated', async () => {
    mockVerifyRoute.mockResolvedValue(null)
    const res = await GET(makeRequest('test'))
    expect(res.status).toBe(401)
  })

  it('returns 400 if q is empty', async () => {
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(400)
  })

  it('returns 400 if q is too short', async () => {
    const res = await GET(makeRequest('a'))
    expect(res.status).toBe(400)
  })

  it('returns cards matching query', async () => {
    mockPrisma.card.findMany.mockResolvedValue([
      {
        id: 'c1', title: 'Fix bug', description: 'details',
        sprintId: 's1',
        sprint: { name: 'Sprint 1' },
        sprintColumn: { title: 'A Fazer' },
        tags: [],
      },
    ])
    const res = await GET(makeRequest('fix'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Fix bug')
  })

  it('queries with take: 20 to limit results', async () => {
    mockPrisma.card.findMany.mockResolvedValue([])
    await GET(makeRequest('card'))
    const callArgs = mockPrisma.card.findMany.mock.calls[0][0]
    expect(callArgs.take).toBe(20)
  })
})
