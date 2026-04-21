import { Module } from '@nestjs/common'
import { TimeEntryController } from './time-entry.controller'
import { TimeEntryService } from './time-entry.service'

@Module({
  controllers: [TimeEntryController],
  providers: [TimeEntryService],
})
export class TimeEntryModule {}
