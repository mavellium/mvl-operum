// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.FILE_SERVICE_URL = 'http://file-service'
})

vi.mock('@/lib/routeAuth', () => ({
  verifyRouteSession: vi.fn(),
}))
vi.mock('@/lib/api-client', () => ({
  cardsApi: {
    get: vi.fn(),
  },
}))

import { POST } from '@/app/api/uploads/route'
import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'

const mockVerifyRoute = verifyRouteSession as ReturnType<typeof vi.fn>
const originalFetch = global.fetch

function makeRequest(body: FormData, sessionToken?: string): Request {
  const headers: Record<string, string> = {}
  if (sessionToken) headers['cookie'] = `session=${sessionToken}`
  return new Request('http://localhost/api/uploads', {
    method: 'POST',
    body,
    headers,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyRoute.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('POST /api/uploads', () => {
  it('returns 401 without session', async () => {
    mockVerifyRoute.mockResolvedValue(null)
    const form = new FormData()
    const res = await POST(makeRequest(form))
    expect(res.status).toBe(401)
  })

  it('returns 400 without cardId field', async () => {
    const form = new FormData()
    form.set('file', new File(['data'], 'img.png', { type: 'image/png' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed MIME type', async () => {
    const form = new FormData()
    form.set('cardId', 'c1')
    form.set('file', new File(['data'], 'doc.txt', { type: 'text/plain' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 201 with Attachment shape on success', async () => {
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'c1', title: 'Card', description: '', color: '#fff' } as never)
    const attachment = {
      id: 'att1',
      cardId: 'c1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      filePath: '/uploads/c1/uuid.jpg',
      fileSize: 500,
      uploadedAt: new Date().toISOString(),
    }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(attachment), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    )

    const form = new FormData()
    form.set('cardId', 'c1')
    form.set('file', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ id: 'att1', cardId: 'c1' })
  })
})
