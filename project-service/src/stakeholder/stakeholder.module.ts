import { Module } from '@nestjs/common'
import { StakeholderController } from './stakeholder.controller'
import { StakeholderService } from './stakeholder.service'

@Module({
  controllers: [StakeholderController],
  providers: [StakeholderService],
})
export class StakeholderModule {}
