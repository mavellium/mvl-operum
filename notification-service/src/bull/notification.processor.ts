import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { NotificationService } from '../notification/notification.service'
import { CreateNotificationSchema } from '../notification/dto/create-notification.dto'

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly service: NotificationService) {
    super()
  }

  async process(job: Job) {
    const dto = CreateNotificationSchema.parse(job.data)
    await this.service.create(dto)
  }
}
