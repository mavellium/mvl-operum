import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtService } from './jwt.service'
import { AdminGuard } from '../guards/admin.guard'
import { MailerService } from '../mailer/mailer.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, AdminGuard, MailerService],
  exports: [JwtService],
})
export class AuthModule {}
