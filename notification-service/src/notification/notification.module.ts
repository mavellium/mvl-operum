import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { NotificationProcessor } from '../bull/notification.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor],
})
export class NotificationModule {}
