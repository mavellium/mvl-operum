import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtService } from './jwt.service'
import { AdminGuard } from '../guards/admin.guard'

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, AdminGuard],
  exports: [JwtService],
})
export class AuthModule {}
