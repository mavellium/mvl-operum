import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'
import { CardScope } from './card-scope'

@Module({
  controllers: [UploadController],
  providers: [UploadService, CardScope],
})
export class UploadModule {}
