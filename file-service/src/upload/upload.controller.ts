import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
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
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    if (!cardId) throw new BadRequestException('cardId é obrigatório')
    return this.uploadService.upload(file, cardId)
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('attachmentId') attachmentId: string,
    @Headers('x-user-id') userId: string,
  ) {
    await this.uploadService.delete(attachmentId, userId)
  }

  @Get(':attachmentId/url')
  async getPresignedUrl(@Param('attachmentId') attachmentId: string) {
    return this.uploadService.getPresignedUrl(attachmentId)
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') userId: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    if (!userId) throw new BadRequestException('x-user-id header é obrigatório')
    return this.uploadService.uploadAvatar(file, userId)
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityId') entityId: string,
    @Query('type') type: 'project' | 'stakeholder',
  ) {
    if (!file) throw new BadRequestException('Arquivo é obrigatório')
    if (!entityId) throw new BadRequestException('entityId é obrigatório')
    return this.uploadService.uploadLogo(file, entityId, type ?? 'project')
  }
}
