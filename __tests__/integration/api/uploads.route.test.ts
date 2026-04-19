// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/fileUploadService', () => ({
  saveUpload: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    card: { findUnique: vi.fn() },
  },
}))

import { POST } from '@/app/api/uploads/route'
import { saveUpload } from '@/services/fileUploadService'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'

const mockSave = saveUpload as ReturnType<typeof vi.fn>
const mockDecrypt = decrypt as ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as { user: { findUnique: ReturnType<typeof vi.fn> }; card: { findUnique: ReturnType<typeof vi.fn> } }
const mockUserFindUnique = mockPrisma.user.findUnique

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
  mockDecrypt.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
  mockUserFindUnique.mockResolvedValue({ tokenVersion: 0, isActive: true, deletedAt: null })
})

describe('POST /api/uploads', () => {
  it('returns 401 without session', async () => {
    mockDecrypt.mockResolvedValue(null)
    const form = new FormData()
    const res = await POST(makeRequest(form))
    expect(res.status).toBe(401)
  })

  it('returns 400 without cardId field', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    const form = new FormData()
    form.set('file', new File(['data'], 'img.png', { type: 'image/png' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed MIME type', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    const form = new FormData()
    form.set('cardId', 'c1')
    form.set('file', new File(['data'], 'doc.txt', { type: 'text/plain' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 201 with Attachment shape on success', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    mockPrisma.card.findUnique.mockResolvedValue({ sprint: null })
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
