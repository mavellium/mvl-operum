import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { TenantModule } from './tenant/tenant.module'
import { RedisModule } from './redis/redis.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [RedisModule, AuthModule, TenantModule],
  controllers: [HealthController],
})
export class AppModule {}
