import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'
import { createHash, randomInt } from 'crypto'
import { JwtService } from './jwt.service'
import { RedisService } from '../redis/redis.service'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ChangePasswordDto, RequestResetDto, ValidateCodeDto, ResetPasswordDto } from './dto/password.dto'

const BCRYPT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 10
const RESET_CODE_TTL_MS = 15 * 60 * 1000

function hashResetToken(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('')
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(dto: LoginDto, subdomain?: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { ...(subdomain ? { subdomain } : {}), status: 'ACTIVE' },
    })

    if (!tenant) throw new UnauthorizedException('Tenant não encontrado')

    const user = await prisma.user.findFirst({
      where: { email: dto.email, tenantId: tenant.id, deletedAt: null },
    })

    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    if (!user.isActive || user.status !== 'active') {
      throw new UnauthorizedException('Conta inativa ou bloqueada')
    }

    if ((user.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException('Conta bloqueada por excesso de tentativas. Contate o suporte.')
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash)
    if (!match) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: (user.loginAttempts ?? 0) + 1 },
      })
      throw new UnauthorizedException('Credenciais inválidas')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), loginAttempts: 0 },
    })

    const { token, jti } = await this.jwtService.sign({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    })

    await this.redis.setSession(jti, {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    })

    return {
      token,
      forcePasswordChange: user.forcePasswordChange,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        avatarUrl: user.avatarUrl,
      },
    }
  }

  async register(dto: RegisterDto) {
    const existing = await prisma.user.findFirst({
      where: { email: dto.email, tenantId: dto.tenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Email já cadastrado')

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        tenantId: dto.tenantId,
        role: dto.role ?? 'member',
        forcePasswordChange: dto.forcePasswordChange ?? false,
      },
    })

    const { passwordHash: _, ...safeUser } = user
    return safeUser
  }

  async logout(jti: string) {
    await this.redis.deleteSession(jti)
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        avatarUrl: true,
        cargo: true,
        departamento: true,
        hourlyRate: true,
        isActive: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  async verify(token: string) {
    const payload = await this.jwtService.verify(token)
    if (!payload) throw new UnauthorizedException('Token inválido')

    if (payload.jti) {
      const session = await this.redis.getSession(payload.jti)
      if (!session) throw new UnauthorizedException('Sessão inválida ou expirada')
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, tokenVersion: true, isActive: true, status: true, deletedAt: true },
    })

    if (!user || user.deletedAt || !user.isActive || user.status !== 'active') {
      throw new UnauthorizedException('Usuário inativo ou removido')
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sessão invalidada')
    }

    return { userId: payload.userId, tenantId: payload.tenantId, role: payload.role }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash)
    if (!match) throw new ForbiddenException('Senha atual incorreta')

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    })
  }

  async alterarSenha(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        forcePasswordChange: false,
        tokenVersion: { increment: 1 },
      },
    })
  }

  async requestPasswordReset(dto: RequestResetDto) {
    // Always return success to avoid user enumeration
    try {
      const user = await prisma.user.findFirst({
        where: { email: dto.email, deletedAt: null },
      })
      if (user) {
        const code = generateCode()
        const expiry = new Date(Date.now() + RESET_CODE_TTL_MS)
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: hashResetToken(code), resetTokenExpiry: expiry },
        })
        if (process.env.NODE_ENV !== 'production') {
          console.info(`[DEV] Reset code for ${dto.email}: ${code}`)
        }
      }
    } catch {
      // swallow
    }
    return { success: true }
  }

  async validateResetCode(dto: ValidateCodeDto) {
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        resetToken: hashResetToken(dto.code),
        resetTokenExpiry: { gt: new Date() },
      },
    })
    if (!user) throw new UnauthorizedException('Código inválido ou expirado')
    return { valid: true }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        resetToken: hashResetToken(dto.code),
        resetTokenExpiry: { gt: new Date() },
      },
    })
    if (!user) throw new UnauthorizedException('Código inválido ou expirado')

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 },
      },
    })
    return { success: true }
  }
}
