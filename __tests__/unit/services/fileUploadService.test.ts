// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

vi.mock('@/lib/prisma', () => ({
  default: {
    attachment: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '@/lib/prisma'
import * as fsp from 'fs/promises'
import { saveUpload, deleteUpload } from '@/services/fileUploadService'

const mockPrisma = prisma as {
  attachment: {
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

const mockFsp = fsp as {
  mkdir: ReturnType<typeof vi.fn>
  writeFile: ReturnType<typeof vi.fn>
  unlink: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

const makeFile = (name: string, type: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('saveUpload', () => {
  it('rejects oversized file (>10 MB) without writing to disk', async () => {
    const file = makeFile('big.png', 'image/png', 11 * 1024 * 1024)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockFsp.writeFile).not.toHaveBeenCalled()
  })

  it('rejects disallowed MIME type', async () => {
    const file = makeFile('data.csv', 'text/csv', 100)
    await expect(saveUpload(file, 'card1')).rejects.toThrow()
    expect(mockFsp.writeFile).not.toHaveBeenCalled()
  })

  it('generates a UUID-based filename (prevents path traversal)', async () => {
    const file = makeFile('../../../evil.png', 'image/png', 1000)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: '/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const writeCall = mockFsp.writeFile.mock.calls[0]
    const writtenPath = writeCall[0] as string
    expect(writtenPath).not.toContain('..')
    expect(path.basename(writtenPath)).not.toBe('../../../evil.png')
  })

  it('creates Attachment DB record with correct filePath', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 500)
    mockPrisma.attachment.create.mockResolvedValue({
      id: 'att1',
      cardId: 'card1',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      filePath: '/uploads/card1/some-uuid.jpg',
      fileSize: 500,
      uploadedAt: new Date(),
    })
    const result = await saveUpload(file, 'card1')
    expect(mockPrisma.attachment.create).toHaveBeenCalledOnce()
    const createArg = mockPrisma.attachment.create.mock.calls[0][0]
    expect(createArg.data.cardId).toBe('card1')
    expect(result.filePath).toContain('uploads')
  })

  it('writes file to public/uploads/{cardId}/ directory', async () => {
    const file = makeFile('img.png', 'image/png', 200)
    mockPrisma.attachment.create.mockResolvedValue({ id: 'att1', filePath: '/uploads/card1/uuid.png' })
    await saveUpload(file, 'card1')
    const writeCall = mockFsp.writeFile.mock.calls[0]
    expect(writeCall[0]).toContain('card1')
    expect(writeCall[0]).toContain('uploads')
  })
})

describe('deleteUpload', () => {
  it('deletes file from disk and removes DB record', async () => {
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att1',
      filePath: '/uploads/card1/uuid.png',
    })
    mockPrisma.attachment.delete.mockResolvedValue({ id: 'att1' })
    await deleteUpload('att1')
    expect(mockFsp.unlink).toHaveBeenCalledOnce()
    expect(mockPrisma.attachment.delete).toHaveBeenCalledOnce()
  })
})
