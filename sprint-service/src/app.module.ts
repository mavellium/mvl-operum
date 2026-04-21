import { Module } from '@nestjs/common'
import { SprintModule } from './sprint/sprint.module'
import { CardModule } from './card/card.module'
import { CommentModule } from './comment/comment.module'
import { TimeEntryModule } from './time-entry/time-entry.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { AuditModule } from './audit/audit.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [SprintModule, CardModule, CommentModule, TimeEntryModule, DashboardModule, AuditModule],
  controllers: [HealthController],
})
export class AppModule {}
