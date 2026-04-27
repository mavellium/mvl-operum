import { Module } from '@nestjs/common'
import { ProjectModule } from './project/project.module'
import { DepartmentModule } from './department/department.module'
import { RoleModule } from './role/role.module'
import { StakeholderModule } from './stakeholder/stakeholder.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [ProjectModule, DepartmentModule, RoleModule, StakeholderModule],
  controllers: [HealthController],
})
export class AppModule {}
