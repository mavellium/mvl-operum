// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({
  verifyRouteSession: vi.fn(),
}))
vi.mock('@/services/fileUploadService', () => ({
  saveUpload: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    card: { findUnique: vi.fn() },
  },
}))

import { POST } from '@/app/api/uploads/route'
import { saveUpload } from '@/services/fileUploadService'
import { verifyRouteSession } from '@/lib/routeAuth'
import prisma from '@/lib/prisma'

const mockSave = saveUpload as ReturnType<typeof vi.fn>
const mockVerifyRoute = verifyRouteSession as ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as { card: { findUnique: ReturnType<typeof vi.fn> } }

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
    mockPrisma.card.findUnique.mockResolvedValue({ sprint: { project: { tenantId: 't1' } } })
    mockSave.mockResolvedValue({
      id: 'att1',
      cardId: 'c1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      filePath: '/uploads/c1/uuid.jpg',
      fileSize: 500,
      uploadedAt: new Date(),
    })
    const form = new FormData()
    form.set('cardId', 'c1')
    form.set('file', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ id: 'att1', cardId: 'c1' })
  })
})
