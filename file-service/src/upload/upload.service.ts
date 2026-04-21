import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaClient } from '../../lib/generated/prisma'
import { v4 as uuidv4 } from 'uuid'
import { MinioService } from '../minio/minio.service'

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

@Injectable()
export class UploadService {
  private readonly prisma = new PrismaClient()

  constructor(private readonly minio: MinioService) {}

  async upload(file: Express.Multer.File, cardId: string) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`)
    }

    const ext = file.originalname.includes('.')
      ? `.${file.originalname.split('.').pop()!.toLowerCase()}`
      : ''
    const safeFileName = `${uuidv4()}${ext}`
    const key = this.minio.buildKey('uploads', cardId, safeFileName)

    const fileUrl = await this.minio.upload(key, file.buffer, file.mimetype)

    return this.prisma.attachment.create({
      data: {
        cardId,
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: fileUrl,
        fileSize: file.size,
      },
    })
  }

  async delete(attachmentId: string, userId?: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId, deletedAt: null },
    })
    if (!attachment) throw new NotFoundException('Anexo não encontrado')

    const key = this.minio.extractKey(attachment.filePath)
    if (key) await this.minio.delete(key)

    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    })
  }

  async getPresignedUrl(attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId, deletedAt: null },
    })
    if (!attachment) throw new NotFoundException('Anexo não encontrado')

    const key = this.minio.extractKey(attachment.filePath)
    if (!key) return { url: attachment.filePath }

    const url = await this.minio.getPresignedUrl(key, 3600)
    return { url }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas para avatar')
    }

    const ext = file.originalname.includes('.')
      ? `.${file.originalname.split('.').pop()!.toLowerCase()}`
      : '.jpg'
    const key = this.minio.buildKey('avatars', userId, `${userId}${ext}`)

    const url = await this.minio.upload(key, file.buffer, file.mimetype)
    return { url }
  }

  async uploadLogo(file: Express.Multer.File, entityId: string, type: 'project' | 'stakeholder') {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas para logo')
    }

    const ext = file.originalname.includes('.')
      ? `.${file.originalname.split('.').pop()!.toLowerCase()}`
      : '.png'
    const key = `logos/${type}s/${entityId}${ext}`

    const url = await this.minio.upload(key, file.buffer, file.mimetype)
    return { url }
  }
}
