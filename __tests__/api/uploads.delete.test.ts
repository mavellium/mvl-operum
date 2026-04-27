// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.FILE_SERVICE_URL = 'http://file-service'
})

vi.mock('@/lib/routeAuth', () => ({
  verifyRouteSession: vi.fn(),
}))

import { DELETE } from '@/app/api/uploads/route'
import { verifyRouteSession } from '@/lib/routeAuth'

const mockVerifyRoute = verifyRouteSession as ReturnType<typeof vi.fn>

function makeRequest(url: string, cookies = 'session=tok') {
  return new Request(url, {
    method: 'DELETE',
    headers: { cookie: cookies },
  })
}

const originalFetch = global.fetch

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyRoute.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('DELETE /api/uploads', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyRoute.mockResolvedValue(null)
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when attachment id is missing', async () => {
    const res = await DELETE(makeRequest('http://localhost/api/uploads'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when attachment not found', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not found' }), { status: 404 }),
    )
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=missing'))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not the card owner', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
    )
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(res.status).toBe(403)
  })

  it('returns 204 and removes attachment when owner', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(res.status).toBe(204)
  })
})
