// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    attachment: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/uploads/card1/uuid.jpg' }),
  del: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '@/lib/prisma'
import * as vercelBlob from '@vercel/blob'
import { saveUpload, deleteUpload } from '@/services/fileUploadService'

const mockPrisma = prisma as {
  attachment: {
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

const mockBlob = vercelBlob as {
  put: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockBlob.put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/uploads/card1/uuid.jpg' })
})

const makeFile = (name: string, type: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('saveUpload', () => {
  it('rejects oversized file (>10 MB) without calling put', async () => {
    const file = makeFile('big.png', 'image/png', 11 * 1024 * 1024)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockBlob.put).not.toHaveBeenCalled()
  })

  it('rejects disallowed MIME type', async () => {
    const file = makeFile('data.csv', 'text/csv', 100)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockBlob.put).not.toHaveBeenCalled()
  })

  it('generates a UUID-based filename (prevents path traversal)', async () => {
    const file = makeFile('../../../evil.png', 'image/png', 1000)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: 'https://blob.vercel-storage.com/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const putCall = mockBlob.put.mock.calls[0]
    const blobPath = putCall[0] as string
    expect(blobPath).not.toContain('..')
    expect(blobPath).not.toContain('evil.png')
  })

  it('creates Attachment DB record with blob URL as filePath', async () => {
    const blobUrl = 'https://blob.vercel-storage.com/uploads/card1/some-uuid.jpg'
    mockBlob.put.mockResolvedValue({ url: blobUrl })
    const file = makeFile('photo.jpg', 'image/jpeg', 500)
    mockPrisma.attachment.create.mockResolvedValue({
      id: 'att1',
      cardId: 'card1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      filePath: blobUrl,
      fileSize: 500,
      uploadedAt: new Date(),
    })
    const result = await saveUpload(file, 'card1')
    expect(mockPrisma.attachment.create).toHaveBeenCalledOnce()
    const createArg = mockPrisma.attachment.create.mock.calls[0][0]
    expect(createArg.data.cardId).toBe('card1')
    expect(createArg.data.filePath).toBe(blobUrl)
    expect(result.filePath).toBe(blobUrl)
  })

  it('uploads to blob path containing cardId', async () => {
    const file = makeFile('img.png', 'image/png', 200)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: 'https://blob.vercel-storage.com/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const putCall = mockBlob.put.mock.calls[0]
    expect(putCall[0]).toContain('card1')
    expect(putCall[0]).toContain('uploads')
  })
})

describe('deleteUpload', () => {
  it('deletes blob and soft-deletes DB record when no userId provided (internal)', async () => {
    const blobUrl = 'https://blob.vercel-storage.com/uploads/card1/uuid.png'
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: blobUrl,
      card: { responsibles: [] },
    })
    mockPrisma.attachment.update.mockResolvedValue({ id: 'att1', deletedAt: new Date() })
    await deleteUpload('att1')
    expect(mockBlob.del).toHaveBeenCalledOnce()
    expect(mockBlob.del).toHaveBeenCalledWith(blobUrl)
    expect(mockPrisma.attachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })

  it('soft-deletes blob when userId matches a responsible', async () => {
    const blobUrl = 'https://blob.vercel-storage.com/uploads/card1/uuid.png'
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: blobUrl,
      card: { responsibles: [{ userId: 'u1' }] },
    })
    mockPrisma.attachment.update.mockResolvedValue({ id: 'att1', deletedAt: new Date() })
    await deleteUpload('att1', 'u1')
    expect(mockBlob.del).toHaveBeenCalledOnce()
    expect(mockPrisma.attachment.update).toHaveBeenCalledOnce()
  })

  it('throws 403 error if userId is provided and user is not a responsible', async () => {
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: 'https://blob.test/f.png',
      card: { responsibles: [{ userId: 'other' }] },
    })
    await expect(deleteUpload('att1', 'u1')).rejects.toThrow(/permiss|autoriza|forbid/i)
  })
})
