import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common'
import { prisma } from '../prisma'
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

// Explicit whitelist — never derive extension from user-controlled filename
const MIME_TO_EXT: Record<string, string> = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif':  '.gif',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
}

const MAX_FILENAME_LENGTH = 255
// Reject path separators and null bytes to prevent traversal / injection
const SAFE_FILENAME_RE = /^[^/\\:*?"<>|\x00]+$/

function assertUser(userId: string | undefined): asserts userId is string {
  if (!userId) throw new ForbiddenException('Usuário não identificado')
}

function validateFileName(name: string): void {
  if (!name || name.length > MAX_FILENAME_LENGTH) {
    throw new BadRequestException(`Nome de arquivo deve ter entre 1 e ${MAX_FILENAME_LENGTH} caracteres`)
  }
  if (!SAFE_FILENAME_RE.test(name)) {
    throw new BadRequestException('Nome de arquivo contém caracteres inválidos')
  }
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private readonly prisma = prisma

  constructor(private readonly minio: MinioService) {}

  async upload(file: Express.Multer.File, cardId: string, userId: string) {
    assertUser(userId)
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`)
    }
    validateFileName(file.originalname)

    const ext = MIME_TO_EXT[file.mimetype] ?? ''
    const key = this.minio.buildKey('uploads', cardId, `${uuidv4()}${ext}`)

    let fileUrl: string
    try {
      fileUrl = await this.minio.upload(key, file.buffer, file.mimetype)
    } catch (error) {
      this.logger.error(
        `upload: falha no armazenamento — key=${key} cardId=${cardId} mimetype=${file.mimetype} originalname=${file.originalname}`,
        error instanceof Error ? error.stack : String(error),
      )
      throw new InternalServerErrorException('Falha no armazenamento')
    }

    try {
      return await this.prisma.attachment.create({
        data: {
          cardId,
          fileName: file.originalname,
          fileType: file.mimetype,
          filePath: fileUrl,
          fileSize: file.size,
        },
      })
    } catch (error) {
      // Roll back orphaned object on DB failure
      await this.minio.delete(key).catch(() => undefined)
      this.logger.error(
        `upload: falha ao registrar anexo — key=${key} cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      )
      throw new InternalServerErrorException('Falha ao registrar o anexo')
    }
  }

  async listByCards(cardIds: string[], userId: string) {
    assertUser(userId)
    if (cardIds.length === 0) return []
    // Authorization enforced at API-gateway perimeter: the caller (Next.js server action)
    // calls verifySession() and fetches the card list from sprint-service, which already
    // validated that the authenticated user belongs to the tenant that owns those cards.
    // Only card IDs returned by sprint-service for that user's session are passed here.
    try {
      return await this.prisma.attachment.findMany({
        where: { cardId: { in: cardIds }, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })
    } catch (error) {
      this.logger.error(`listByCards: erro ao buscar anexos — cardIds=${cardIds.join(',')}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar anexos')
    }
  }

  async setCover(attachmentId: string, cardId: string, userId: string) {
    assertUser(userId)
    let attachment: { id: string; cardId: string } | null
    try {
      attachment = await this.prisma.attachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
      })
    } catch (error) {
      this.logger.error(`setCover: erro ao buscar anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar o anexo')
    }
    if (!attachment) throw new NotFoundException('Anexo não encontrado')
    try {
      await this.prisma.attachment.updateMany({
        where: { cardId, isCover: true, deletedAt: null },
        data: { isCover: false },
      })
      return await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { isCover: true },
      })
    } catch (error) {
      this.logger.error(`setCover: erro ao definir capa — attachmentId=${attachmentId} cardId=${cardId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao definir capa')
    }
  }

  async rename(attachmentId: string, fileName: string, userId: string) {
    assertUser(userId)
    validateFileName(fileName)
    // Authorization enforced at API-gateway perimeter (InternalAuthGuard + card-access
    // check in the Next.js route). The service validates identity and input only.
    let attachment: { id: string } | null
    try {
      attachment = await this.prisma.attachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
      })
    } catch (error) {
      this.logger.error(`rename: erro ao buscar anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar o anexo')
    }
    if (!attachment) throw new NotFoundException('Anexo não encontrado')
    try {
      return await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { fileName, updatedAt: new Date() },
      })
    } catch (error) {
      this.logger.error(`rename: erro ao renomear anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao renomear o anexo')
    }
  }

  async delete(attachmentId: string, userId: string) {
    assertUser(userId)
    let attachment: { id: string; filePath: string } | null
    try {
      attachment = await this.prisma.attachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
      })
    } catch (error) {
      this.logger.error(`delete: erro ao buscar anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar o anexo')
    }
    if (!attachment) throw new NotFoundException('Anexo não encontrado')

    const key = this.minio.extractKey(attachment.filePath)
    if (key) await this.minio.delete(key)

    try {
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date() },
      })
    } catch (error) {
      this.logger.error(`delete: erro ao excluir anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao excluir o anexo')
    }
  }

  async getPresignedUrl(attachmentId: string, userId: string) {
    assertUser(userId)
    let attachment: { id: string; filePath: string } | null
    try {
      attachment = await this.prisma.attachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
      })
    } catch (error) {
      this.logger.error(`getPresignedUrl: erro ao buscar anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar o anexo')
    }
    if (!attachment) throw new NotFoundException('Anexo não encontrado')

    const key = this.minio.extractKey(attachment.filePath)
    if (!key) return { url: attachment.filePath }

    const url = await this.minio.getPresignedUrl(key, 3600)
    return { url }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    assertUser(userId)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas para avatar')
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? '.jpg'
    const key = this.minio.buildKey('avatars', userId, `${userId}${ext}`)

    try {
      const url = await this.minio.upload(key, file.buffer, file.mimetype)
      return { url }
    } catch (error) {
      this.logger.error(`uploadAvatar: falha no armazenamento — key=${key} userId=${userId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Falha no armazenamento')
    }
  }

  async uploadLogo(file: Express.Multer.File, entityId: string, type: 'project' | 'stakeholder') {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas para logo')
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? '.png'
    const key = `logos/${type}s/${entityId}${ext}`

    try {
      const url = await this.minio.upload(key, file.buffer, file.mimetype)
      return { url }
    } catch (error) {
      this.logger.error(`uploadLogo: falha no armazenamento — key=${key} entityId=${entityId} type=${type}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Falha no armazenamento')
    }
  }
}
