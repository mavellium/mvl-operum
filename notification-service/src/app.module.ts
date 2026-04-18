import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { NotificationModule } from './notification/notification.module'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    NotificationModule,
  ],
})
export class AppModule {}
