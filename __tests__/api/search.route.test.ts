// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({
  verifyRouteSession: vi.fn(),
}))
vi.mock('@/lib/api-client', () => ({
  cardsApi: {
    search: vi.fn(),
  },
}))

import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'
import { GET } from '@/app/api/search/route'

const mockVerifyRoute = verifyRouteSession as ReturnType<typeof vi.fn>

const makeRequest = (q: string, cookie = 'session=valid-token') =>
  new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}`, {
    headers: { cookie },
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyRoute.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
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
    vi.mocked(cardsApi.search).mockResolvedValue([
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

  it('returns empty results when api throws', async () => {
    vi.mocked(cardsApi.search).mockRejectedValue(new Error('Internal error'))
    const res = await GET(makeRequest('card'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(0)
  })
})
