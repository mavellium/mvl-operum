import { mkdir, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { FileUploadSchema } from '@/lib/validation/fileSchemas'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function saveUpload(file: File, cardId: string) {
  const validation = FileUploadSchema.safeParse({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  })

  if (!validation.success) {
    throw new ValidationError(validation.error.issues[0].message)
  }

  const ext = path.extname(file.name).toLowerCase() || ''
  const safeFileName = `${uuidv4()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', cardId)
  const absolutePath = path.join(uploadDir, safeFileName)
  const publicPath = `/uploads/${cardId}/${safeFileName}`

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(absolutePath, buffer)

  const attachment = await prisma.attachment.create({
    data: {
      cardId,
      fileName: file.name,
      fileType: file.type,
      filePath: publicPath,
      fileSize: file.size,
    },
  })

  return attachment
}

export async function deleteUpload(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } })
  if (!attachment) return

  const absolutePath = path.join(process.cwd(), 'public', attachment.filePath)
  try {
    await unlink(absolutePath)
  } catch {
    // file may already be gone
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })
}
