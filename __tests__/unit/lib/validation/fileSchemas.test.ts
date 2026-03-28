import { describe, it, expect } from 'vitest'
import { FileUploadSchema } from '@/lib/validation/fileSchemas'

const MB = 1024 * 1024

describe('FileUploadSchema', () => {
  it('rejects file exceeding 10 MB', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'img.png', fileType: 'image/png', fileSize: 11 * MB })
    expect(result.success).toBe(false)
  })

  it('rejects disallowed MIME type text/csv', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'data.csv', fileType: 'text/csv', fileSize: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects disallowed MIME type text/plain', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'note.txt', fileType: 'text/plain', fileSize: 100 })
    expect(result.success).toBe(false)
  })

  it('accepts image/png', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'img.png', fileType: 'image/png', fileSize: 500 * 1024 })
    expect(result.success).toBe(true)
  })

  it('accepts image/jpeg', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'photo.jpg', fileType: 'image/jpeg', fileSize: 1 * MB })
    expect(result.success).toBe(true)
  })

  it('accepts image/webp', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'img.webp', fileType: 'image/webp', fileSize: 200 })
    expect(result.success).toBe(true)
  })

  it('accepts application/pdf', () => {
    const result = FileUploadSchema.safeParse({ fileName: 'doc.pdf', fileType: 'application/pdf', fileSize: 2 * MB })
    expect(result.success).toBe(true)
  })

  it('rejects empty fileName', () => {
    const result = FileUploadSchema.safeParse({ fileName: '', fileType: 'image/png', fileSize: 100 })
    expect(result.success).toBe(false)
  })
})
