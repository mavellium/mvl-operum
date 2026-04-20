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

vi.mock('@/lib/minio', () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
  BUCKET: 'test-bucket',
  publicUrl: vi.fn().mockImplementation((key: string) => `http://minio.test/test-bucket/${key}`),
}))

import prisma from '@/lib/prisma'
import { s3, publicUrl } from '@/lib/minio'
import { saveUpload, deleteUpload } from '@/services/fileUploadService'

const mockPrisma = prisma as {
  attachment: {
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

const mockS3 = s3 as { send: ReturnType<typeof vi.fn> }
const mockPublicUrl = publicUrl as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockS3.send.mockResolvedValue({})
  mockPublicUrl.mockImplementation((key: string) => `http://minio.test/test-bucket/${key}`)
})

const makeFile = (name: string, type: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('saveUpload', () => {
  it('rejects oversized file (>10 MB) without calling put', async () => {
    const file = makeFile('big.png', 'image/png', 11 * 1024 * 1024)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockS3.send).not.toHaveBeenCalled()
  })

  it('rejects disallowed MIME type', async () => {
    const file = makeFile('data.csv', 'text/csv', 100)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockS3.send).not.toHaveBeenCalled()
  })

  it('generates a UUID-based filename (prevents path traversal)', async () => {
    const file = makeFile('../../../evil.png', 'image/png', 1000)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: 'http://minio.test/test-bucket/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const sendCall = mockS3.send.mock.calls[0][0] as { input: { Key: string } }
    expect(sendCall.input.Key).not.toContain('..')
    expect(sendCall.input.Key).not.toContain('evil.png')
  })

  it('creates Attachment DB record with blob URL as filePath', async () => {
    const key = 'uploads/card1/some-uuid.jpg'
    const fileUrl = `http://minio.test/test-bucket/${key}`
    mockPublicUrl.mockReturnValue(fileUrl)
    const file = makeFile('photo.jpg', 'image/jpeg', 500)
    mockPrisma.attachment.create.mockResolvedValue({
      id: 'att1',
      cardId: 'card1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      filePath: fileUrl,
      fileSize: 500,
      uploadedAt: new Date(),
    })
    const result = await saveUpload(file, 'card1')
    expect(mockPrisma.attachment.create).toHaveBeenCalledOnce()
    const createArg = mockPrisma.attachment.create.mock.calls[0][0]
    expect(createArg.data.cardId).toBe('card1')
    expect(createArg.data.filePath).toBe(fileUrl)
    expect(result.filePath).toBe(fileUrl)
  })

  it('uploads to blob path containing cardId', async () => {
    const file = makeFile('img.png', 'image/png', 200)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: 'http://minio.test/test-bucket/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const sendCall = mockS3.send.mock.calls[0][0] as { input: { Key: string } }
    expect(sendCall.input.Key).toContain('card1')
    expect(sendCall.input.Key).toContain('uploads')
  })
})

describe('deleteUpload', () => {
  it('deletes blob and soft-deletes DB record when no userId provided (internal)', async () => {
    const key = 'uploads/card1/uuid.png'
    const blobUrl = `http://minio.test/test-bucket/${key}`
    process.env.MINIO_PUBLIC_URL = 'http://minio.test'
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: blobUrl,
      card: { responsibles: [] },
    })
    mockPrisma.attachment.update.mockResolvedValue({ id: 'att1', deletedAt: new Date() })
    await deleteUpload('att1')
    expect(mockS3.send).toHaveBeenCalledOnce()
    expect(mockPrisma.attachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })

  it('soft-deletes blob when userId matches a responsible', async () => {
    const key = 'uploads/card1/uuid.png'
    const blobUrl = `http://minio.test/test-bucket/${key}`
    process.env.MINIO_PUBLIC_URL = 'http://minio.test'
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: blobUrl,
      card: { responsibles: [{ userId: 'u1' }] },
    })
    mockPrisma.attachment.update.mockResolvedValue({ id: 'att1', deletedAt: new Date() })
    await deleteUpload('att1', 'u1')
    expect(mockS3.send).toHaveBeenCalledOnce()
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
