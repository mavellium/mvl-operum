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
import { CardScope } from './card-scope'
import { ATTACHMENT_EXT_BY_MIME, LINK_ATTACHMENT_TYPE, MAX_LINK_URL_LENGTH } from './attachment-types'

const MAX_FILENAME_LENGTH = 255
// Reject path separators and null bytes to prevent traversal / injection
const SAFE_FILENAME_RE = /^[^/\\:*?"<>|\x00]+$/

/** Tabela ou coluna inexistente: migration do file-service não aplicada. */
function bancoDesatualizado(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'P2021' || code === 'P2022'
}

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

/** URL de um anexo do tipo link: só http(s), sem usuário/senha embutidos. */
function parseLinkUrl(raw: string | undefined): URL {
  const value = raw?.trim() ?? ''
  if (!value || value.length > MAX_LINK_URL_LENGTH) {
    throw new BadRequestException(`A URL do link deve ter entre 1 e ${MAX_LINK_URL_LENGTH} caracteres`)
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new BadRequestException('URL do link inválida')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('O link deve começar com http:// ou https://')
  }
  if (url.username || url.password) {
    throw new BadRequestException('O link não pode conter usuário ou senha')
  }
  return url
}

/** Título do link: sem caracteres de controle; sem título, usa host + caminho. */
function linkTitle(raw: string | undefined, url: URL): string {
  const title = (raw ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim()
  return (title || `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`).slice(0, MAX_FILENAME_LENGTH)
}

type AttachmentRow = { id: string; cardId: string; filePath: string }

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private readonly prisma = prisma

  constructor(
    private readonly minio: MinioService,
    private readonly scope: CardScope,
  ) {}

  /**
   * Carrega o anexo e confere o tenant pelo card dele (SDD 4.1). Com cardId,
   * exige também que o anexo seja desse card: o app confere o card antes e
   * passa o id, e o anexo de outro card não pode ser mexido por esse caminho.
   * Anexo alheio responde 404, igual a inexistente.
   */
  private async loadAttachment(op: string, attachmentId: string, tenantId: string, cardId?: string): Promise<AttachmentRow> {
    let attachment: AttachmentRow | null
    try {
      attachment = await this.prisma.attachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
      })
    } catch (error) {
      this.logger.error(`${op}: erro ao buscar anexo — attachmentId=${attachmentId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar o anexo')
    }
    if (!attachment || (cardId && attachment.cardId !== cardId)) throw new NotFoundException('Anexo não encontrado')
    try {
      await this.scope.assert(tenantId, attachment.cardId)
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException('Anexo não encontrado')
      throw error
    }
    return attachment
  }

  async upload(file: Express.Multer.File, cardId: string, userId: string, tenantId: string) {
    assertUser(userId)
    if (!Object.prototype.hasOwnProperty.call(ATTACHMENT_EXT_BY_MIME, file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`)
    }
    validateFileName(file.originalname)
    // Antes do MinIO: arquivo para card de outro tenant nem chega a ser gravado.
    await this.scope.assert(tenantId, cardId)

    const ext = ATTACHMENT_EXT_BY_MIME[file.mimetype]
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
      throw new InternalServerErrorException(
        bancoDesatualizado(error)
          ? 'Falha ao registrar o anexo: o banco do serviço de arquivos está desatualizado (migration pendente).'
          : 'Falha ao registrar o anexo',
      )
    }
  }

  /** Anexo do tipo link: grava só a URL (filePath), sem objeto no MinIO. */
  async addLink(cardId: string, rawUrl: string | undefined, rawTitle: string | undefined, userId: string, tenantId: string) {
    assertUser(userId)
    const url = parseLinkUrl(rawUrl)
    await this.scope.assert(tenantId, cardId)
    try {
      return await this.prisma.attachment.create({
        data: {
          cardId,
          fileName: linkTitle(rawTitle, url),
          fileType: LINK_ATTACHMENT_TYPE,
          filePath: url.toString(),
          fileSize: 0,
        },
      })
    } catch (error) {
      this.logger.error(`addLink: falha ao registrar link — cardId=${cardId}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException(
        bancoDesatualizado(error)
          ? 'Falha ao registrar o link: o banco do serviço de arquivos está desatualizado (migration pendente).'
          : 'Falha ao registrar o link',
      )
    }
  }

  /** Só devolve anexos dos cards do tenant; ids de outro tenant são ignorados. */
  async listByCards(cardIds: string[], userId: string, tenantId: string) {
    assertUser(userId)
    if (cardIds.length === 0) return []
    const allowed = await this.scope.inTenant(tenantId, cardIds)
    if (allowed.size === 0) return []
    try {
      return await this.prisma.attachment.findMany({
        where: { cardId: { in: [...allowed] }, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })
    } catch (error) {
      this.logger.error(`listByCards: erro ao buscar anexos — cardIds=${cardIds.join(',')}`, error instanceof Error ? error.stack : String(error))
      throw new InternalServerErrorException('Erro ao buscar anexos')
    }
  }

  async setCover(attachmentId: string, cardId: string, userId: string, tenantId: string) {
    assertUser(userId)
    // cardId obrigatório aqui: é ele que perde a capa anterior.
    await this.loadAttachment('setCover', attachmentId, tenantId, cardId)
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

  async rename(attachmentId: string, fileName: string, userId: string, tenantId: string, cardId?: string) {
    assertUser(userId)
    validateFileName(fileName)
    await this.loadAttachment('rename', attachmentId, tenantId, cardId)
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

  async delete(attachmentId: string, userId: string, tenantId: string, cardId?: string) {
    assertUser(userId)
    const attachment = await this.loadAttachment('delete', attachmentId, tenantId, cardId)

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

  async getPresignedUrl(attachmentId: string, userId: string, tenantId: string, cardId?: string) {
    assertUser(userId)
    const attachment = await this.loadAttachment('getPresignedUrl', attachmentId, tenantId, cardId)

    const key = this.minio.extractKey(attachment.filePath)
    if (!key) return { url: attachment.filePath }

    const url = await this.minio.getPresignedUrl(key, 3600)
    return { url }
  }
}
