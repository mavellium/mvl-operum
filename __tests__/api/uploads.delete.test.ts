// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))

vi.mock('@/services/fileUploadService', () => ({
  deleteUpload: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) { super(message); this.name = 'ValidationError' }
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    attachment: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

import { DELETE } from '@/app/api/uploads/route'
import { decrypt } from '@/lib/session'
import { deleteUpload } from '@/services/fileUploadService'
import prisma from '@/lib/prisma'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>
const mockDeleteUpload = deleteUpload as ReturnType<typeof vi.fn>
const mockPrisma = prisma as { attachment: { findUnique: ReturnType<typeof vi.fn> }; user: { findUnique: ReturnType<typeof vi.fn> } }

function makeRequest(url: string, cookies = 'session=tok') {
  return new Request(url, {
    method: 'DELETE',
    headers: { cookie: cookies },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDecrypt.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
  mockPrisma.user.findUnique.mockResolvedValue({ tokenVersion: 0, isActive: true, deletedAt: null })
})

describe('DELETE /api/uploads', () => {
  it('returns 401 when not authenticated', async () => {
    mockDecrypt.mockResolvedValue(null)
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when attachment id is missing', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    const res = await DELETE(makeRequest('http://localhost/api/uploads'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when attachment not found', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    mockPrisma.attachment.findUnique.mockResolvedValue(null)
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=missing'))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not the card owner', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'a1',
      cardId: 'c1',
      card: { responsibles: [] },
    })
    mockDeleteUpload.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }))
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(res.status).toBe(403)
  })

  it('returns 204 and removes attachment when owner', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1' })
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'a1',
      cardId: 'c1',
    })
    mockDeleteUpload.mockResolvedValue(undefined)
    const res = await DELETE(makeRequest('http://localhost/api/uploads?id=a1'))
    expect(mockDeleteUpload).toHaveBeenCalledWith('a1', 'u1')
    expect(res.status).toBe(204)
  })
})
