import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from '../notification/notification.service';
export declare class NotificationProcessor extends WorkerHost {
    private readonly service;
    constructor(service: NotificationService);
    process(job: Job): Promise<void>;
}
