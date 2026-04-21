import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from './jwt.service'
import { Public } from '../decorators/public.decorator'
import { LoginSchema } from './dto/login.dto'
import { RegisterSchema } from './dto/register.dto'
import {
  ChangePasswordSchema,
  RequestResetSchema,
  ValidateCodeSchema,
  ResetPasswordSchema,
  AlterarSenhaSchema,
} from './dto/password.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const dto = LoginSchema.parse(body)
    return this.authService.login(dto, dto.subdomain)
  }

  // register is admin-only — protected by InternalAuthGuard (x-internal-api-key)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown) {
    const dto = RegisterSchema.parse(body)
    return this.authService.register(dto)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '')
    if (!token) return
    const payload = await this.jwtService.verify(token)
    if (payload?.jti) {
      await this.authService.logout(payload.jti)
    }
  }

  @Get('me')
  async me(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException()
    return this.authService.me(userId)
  }

  @Public()
  @Get('verify')
  async verify(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '')
    if (!token) throw new UnauthorizedException('Token ausente')
    return this.authService.verify(token)
  }

  @Post('password/request-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body() body: unknown) {
    const dto = RequestResetSchema.parse(body)
    return this.authService.requestPasswordReset(dto)
  }

  @Post('password/validate-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  async validateCode(@Body() body: unknown) {
    const dto = ValidateCodeSchema.parse(body)
    return this.authService.validateResetCode(dto)
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: unknown) {
    const dto = ResetPasswordSchema.parse(body)
    return this.authService.resetPassword(dto)
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Headers('x-user-id') userId: string,
    @Body() body: unknown,
  ) {
    if (!userId) throw new UnauthorizedException()
    const dto = ChangePasswordSchema.parse(body)
    await this.authService.changePassword(userId, dto)
  }

  @Patch('me')
  async updateProfile(
    @Headers('x-user-id') userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!userId) throw new UnauthorizedException()
    return this.authService.updateProfile(userId, body as Parameters<AuthService['updateProfile']>[1])
  }

  // Endpoint for forced password change (forcePasswordChange flow)
  @Post('password/alterar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async alterarSenha(
    @Headers('x-user-id') userId: string,
    @Body() body: unknown,
  ) {
    if (!userId) throw new UnauthorizedException()
    const dto = AlterarSenhaSchema.parse(body)
    await this.authService.alterarSenha(userId, dto.password)
  }
}
