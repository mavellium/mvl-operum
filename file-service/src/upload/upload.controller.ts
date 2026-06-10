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
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { UploadService } from './upload.service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function requireUserId(userId: string | undefined): asserts userId is string {
  if (!userId) throw new BadRequestException('x-user-id header é obrigatório')
}

@Controller('files')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    if (!cardId) throw new BadRequestException('cardId é obrigatório')
    return this.uploadService.upload(file, cardId, userId)
  }

  @Get('by-cards')
  async listByCards(
    @Query('cardIds') cardIdsParam: string,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    const cardIds = cardIdsParam ? cardIdsParam.split(',').filter(Boolean) : []
    return this.uploadService.listByCards(cardIds, userId)
  }

  @Patch(':attachmentId/cover')
  async setCover(
    @Param('attachmentId') attachmentId: string,
    @Body() body: { cardId: string },
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    if (!body.cardId?.trim()) throw new BadRequestException('cardId é obrigatório')
    return this.uploadService.setCover(attachmentId, body.cardId.trim(), userId)
  }

  @Patch(':attachmentId')
  async rename(
    @Param('attachmentId') attachmentId: string,
    @Body() body: { fileName: string },
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    if (!body.fileName?.trim()) throw new BadRequestException('fileName é obrigatório')
    return this.uploadService.rename(attachmentId, body.fileName.trim(), userId)
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('attachmentId') attachmentId: string,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    await this.uploadService.delete(attachmentId, userId)
  }

  @Get(':attachmentId/url')
  async getPresignedUrl(
    @Param('attachmentId') attachmentId: string,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    return this.uploadService.getPresignedUrl(attachmentId, userId)
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    return this.uploadService.uploadAvatar(file, userId)
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityId') entityId: string,
    @Query('type') type: 'project' | 'stakeholder',
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId)
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    if (!entityId) throw new BadRequestException('entityId é obrigatório')
    return this.uploadService.uploadLogo(file, entityId, type ?? 'project')
  }
}
