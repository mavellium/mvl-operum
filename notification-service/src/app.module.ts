import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { NotificationModule } from './notification/notification.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
