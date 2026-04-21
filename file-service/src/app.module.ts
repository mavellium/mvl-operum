import { Module } from '@nestjs/common'
import { MinioModule } from './minio/minio.module'
import { UploadModule } from './upload/upload.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [MinioModule, UploadModule],
  controllers: [HealthController],
})
export class AppModule {}
