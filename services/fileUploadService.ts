import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { s3, BUCKET, publicUrl } from '@/lib/minio'
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

  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : ''
  const safeFileName = `${uuidv4()}${ext}`
  const key = `uploads/${cardId}/${safeFileName}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }),
  )

  const attachment = await prisma.attachment.create({
    data: {
      cardId,
      fileName: file.name,
      fileType: file.type,
      filePath: publicUrl(key),
      fileSize: file.size,
    },
  })

  return attachment
}

export async function deleteUpload(attachmentId: string, userId?: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { card: { include: { responsibles: { select: { userId: true } } } } },
  })
  if (!attachment) return

  if (userId) {
    const isResponsible = attachment.card.responsibles.some(r => r.userId === userId)
    if (!isResponsible) {
      throw new Error('Sem permissão para excluir este anexo')
    }
  }

  // Derive the MinIO object key from the stored URL.
  // URL format: {MINIO_PUBLIC_URL}/{BUCKET}/{key}
  const base = (process.env.MINIO_PUBLIC_URL ?? '').replace(/\/$/, '')
  const prefix = `${base}/${BUCKET}/`
  const key = attachment.filePath.startsWith(prefix)
    ? attachment.filePath.slice(prefix.length)
    : null

  if (key) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    } catch {
      // Object may already be gone — soft-delete the DB record regardless
    }
  }

  await prisma.attachment.update({ where: { id: attachmentId }, data: { deletedAt: new Date() } })
}
