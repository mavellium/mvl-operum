import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Query,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { UploadService } from './upload.service'
import { MAX_ATTACHMENT_SIZE } from './attachment-types'

/** Ids do Operum são cuid; tenant e card fora desse formato nem chegam ao banco. */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
/** O app e o MCP pedem anexos em lotes de 100. */
const MAX_CARD_IDS = 500

function requireUserId(userId: string | undefined): asserts userId is string {
  if (!userId) throw new BadRequestException('x-user-id header é obrigatório')
}

/**
 * Tenant de quem chama: o gateway injeta a partir do JWT/PAT, e a rota
 * /api/uploads do app envia o da sessão. Sem ele não há como conferir o card
 * (SDD 4.1), então a requisição é recusada.
 */
function requireTenantId(tenantId: string | undefined): string {
  if (!tenantId || !ID_RE.test(tenantId)) throw new UnauthorizedException('Tenant não identificado')
  return tenantId
}

function optionalCardId(cardId: string | undefined): string | undefined {
  if (cardId === undefined || cardId === '') return undefined
  if (!ID_RE.test(cardId)) throw new BadRequestException('cardId inválido')
  return cardId
}

function requireAttachmentId(attachmentId: string): string {
  if (!ID_RE.test(attachmentId)) throw new BadRequestException('attachmentId inválido')
  return attachmentId
}

function requireCardId(cardId: string | undefined): string {
  const id = optionalCardId(cardId?.trim())
  if (!id) throw new BadRequestException('cardId é obrigatório')
  return id
}

// Avatar e logo não passam por aqui: o app grava direto no MinIO
// (uploadAvatarAction). As rotas /files/avatar e /files/logo foram removidas
// porque ficavam expostas pelo gateway sem uso e sem conferência de dono.
@Controller('files')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    return this.uploadService.upload(file, requireCardId(cardId), userId, tenant)
  }

  @Post('link')
  async addLink(
    @Query('cardId') cardId: string,
    @Body() body: { url?: string; title?: string },
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    // A URL é validada no service (parseLinkUrl): só http(s), até 2048 caracteres, sem usuário/senha.
    return this.uploadService.addLink(requireCardId(cardId), body?.url, body?.title, userId, tenant)
  }

  @Get('by-cards')
  async listByCards(
    @Query('cardIds') cardIdsParam: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    const cardIds = cardIdsParam ? cardIdsParam.split(',').filter(Boolean) : []
    if (cardIds.length > MAX_CARD_IDS) throw new BadRequestException(`No máximo ${MAX_CARD_IDS} cards por consulta`)
    if (cardIds.some(id => !ID_RE.test(id))) throw new BadRequestException('cardIds inválidos')
    return this.uploadService.listByCards(cardIds, userId, tenant)
  }

  @Patch(':attachmentId/cover')
  async setCover(
    @Param('attachmentId') attachmentId: string,
    @Body() body: { cardId: string },
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    return this.uploadService.setCover(requireAttachmentId(attachmentId), requireCardId(body?.cardId), userId, tenant)
  }

  @Patch(':attachmentId')
  async rename(
    @Param('attachmentId') attachmentId: string,
    @Body() body: { fileName: string },
    @Query('cardId') cardId: string | undefined,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    if (!body.fileName?.trim()) throw new BadRequestException('fileName é obrigatório')
    return this.uploadService.rename(requireAttachmentId(attachmentId), body.fileName.trim(), userId, tenant, optionalCardId(cardId))
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('attachmentId') attachmentId: string,
    @Query('cardId') cardId: string | undefined,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    await this.uploadService.delete(requireAttachmentId(attachmentId), userId, tenant, optionalCardId(cardId))
  }

  @Get(':attachmentId/url')
  async getPresignedUrl(
    @Param('attachmentId') attachmentId: string,
    @Query('cardId') cardId: string | undefined,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    requireUserId(userId)
    const tenant = requireTenantId(tenantId)
    return this.uploadService.getPresignedUrl(requireAttachmentId(attachmentId), userId, tenant, optionalCardId(cardId))
  }
}
