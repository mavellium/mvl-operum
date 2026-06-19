import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'
import { JwtService } from './jwt.service'
import { RedisService } from '../redis/redis.service'
import { MailerService } from '../mailer/mailer.service'
import { generateResetCode, hashResetCode, compareResetCode } from '../lib/crypto'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ChangePasswordDto, RequestResetDto, ValidateCodeDto, ResetPasswordDto } from './dto/password.dto'

const BCRYPT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 10
const RESET_CODE_TTL_SECONDS = 15 * 60
const RESET_CODE_TTL_MS = RESET_CODE_TTL_SECONDS * 1000
const RATE_LIMIT_MAX = 3
const MAX_VALIDATE_ATTEMPTS = 5

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly mailer: MailerService,
  ) {}

  async login(dto: LoginDto, subdomain?: string) {
    // Subdomínio informado E resolvido para um tenant ACTIVE: escopo estrito a ele.
    const tenant = subdomain
      ? await prisma.tenant.findFirst({ where: { subdomain, status: 'ACTIVE' } })
      : null

    if (tenant) {
      const user = await prisma.user.findFirst({
        where: { email: dto.email, tenantId: tenant.id, deletedAt: null },
      })
      return this.completeLogin(user, dto.password)
    }

    // Sem tenant resolvido — ausente OU presente mas sem correspondência.
    // A infra atual (Traefik) usa um Host fixo por ambiente (ex.: a própria
    // "operum.mavellium.com.br" em produção), sem wildcard DNS por tenant.
    // getSubdomain() lê o primeiro rótulo desse Host mesmo quando ele não é
    // um subdomínio de tenant de verdade — então "subdomain presente" não
    // pode ser tratado como sinal confiável de tenant inválido. Resolve pelo
    // e-mail; o mesmo e-mail pode existir em mais de um tenant (federação via
    // joinTenant/provisionTenantAdmin), cada um com sua própria senha — por
    // isso testamos a senha contra cada candidato em vez de confiar num
    // findFirst arbitrário, o que poderia autenticar no tenant errado.
    // Ordenado por lastLogin desc (tenant acessado mais recentemente primeiro);
    // quem nunca acessou nenhum tenant vai por último (qualquer um serve).
    const candidates = await prisma.user.findMany({
      where: { email: dto.email, deletedAt: null, tenant: { status: 'ACTIVE' } },
      orderBy: { lastLogin: { sort: 'desc', nulls: 'last' } },
    })

    if (candidates.length <= 1) {
      return this.completeLogin(candidates[0] ?? null, dto.password)
    }

    for (const candidate of candidates) {
      if (!candidate.isActive || candidate.status !== 'active') continue
      if ((candidate.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) continue
      if (await bcrypt.compare(dto.password, candidate.passwordHash)) {
        await prisma.user.update({
          where: { id: candidate.id },
          data: { lastLogin: new Date(), loginAttempts: 0 },
        })
        return this.buildLoginResponse(candidate)
      }
    }

    throw new UnauthorizedException('Credenciais inválidas')
  }

  /** Valida senha/status para um único candidato já resolvido e finaliza o login. */
  private async completeLogin(
    user: Awaited<ReturnType<typeof prisma.user.findFirst>>,
    password: string,
  ) {
    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    if (!user.isActive || user.status !== 'active') {
      throw new UnauthorizedException('Conta inativa ou bloqueada')
    }

    if ((user.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException('Conta bloqueada por excesso de tentativas. Contate o suporte.')
    }

    const match = await bcrypt.compare(password, user.passwordHash)
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

    return this.buildLoginResponse(user)
  }

  private async buildLoginResponse(user: NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>>) {
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
        signatureUrl: true,
        cargo: true,
        departamento: true,
        hourlyRate: true,
        isActive: true,
        forcePasswordChange: true,
        phone: true,
        cep: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        notes: true,
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

  private async resolveTenant(subdomain?: string) {
    return prisma.tenant.findFirst({
      where: { ...(subdomain ? { subdomain } : {}), status: 'ACTIVE' },
    })
  }

  async requestPasswordReset(dto: RequestResetDto) {
    // Rate limit: 3 solicitações por e-mail a cada 15 min
    const rateKey = `reset_rate:${dto.email}`
    const attempts = await this.redis.incrWithTTL(rateKey, RESET_CODE_TTL_SECONDS)
    if (attempts > RATE_LIMIT_MAX) {
      throw new HttpException(
        { success: false, error: 'Muitas solicitações. Aguarde 15 minutos.' },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // Sempre responde sucesso — anti-enumeração
    try {
      const tenant = await this.resolveTenant(dto.subdomain)
      const user = tenant
        ? await prisma.user.findFirst({
            where: { email: dto.email, tenantId: tenant.id, deletedAt: null, isActive: true },
          })
        : null

      if (user) {
        const code = generateResetCode()
        const expiry = new Date(Date.now() + RESET_CODE_TTL_MS)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken: hashResetCode(code),
            resetTokenExpiry: expiry,
          },
        })
        // Zera tentativas de validação para o novo código
        await this.redis.delResetAttempts(user.id)

        const tenantName = tenant?.name ?? 'Operum'
        // Falha de envio é capturada dentro do mailer — nunca vaza para o cliente
        await this.mailer.sendPasswordResetCode(dto.email, code, tenantName)
      } else {
        // Anti-enumeração: executa bcrypt dummy para equalizar o tempo de resposta
        await bcrypt.hash('dummy-anti-enum', BCRYPT_ROUNDS)
      }
    } catch (err) {
      // Erros internos não chegam ao cliente (anti-enumeração)
      if (err instanceof HttpException) throw err
      this.logger.error('requestPasswordReset internal error', err)
    }

    return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá um código.' }
  }

  async validateResetCode(dto: ValidateCodeDto) {
    const tenant = await this.resolveTenant(dto.subdomain)
    const user = tenant
      ? await prisma.user.findFirst({
          where: { email: dto.email, tenantId: tenant.id, deletedAt: null },
        })
      : await prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new HttpException(
        { success: false, error: 'Código inválido ou expirado.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Anti-brute-force: max 5 tentativas por código emitido
    const attemptsKey = `reset_attempts:${user.id}`
    const attempts = await this.redis.incrWithTTL(attemptsKey, RESET_CODE_TTL_SECONDS)
    if (attempts > MAX_VALIDATE_ATTEMPTS) {
      // Invalida o código atual para forçar nova solicitação
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      })
      throw new HttpException(
        { success: false, error: 'Código inválido ou expirado.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const expired = user.resetTokenExpiry < new Date()
    const valid = !expired && compareResetCode(dto.code, user.resetToken)

    if (!valid) {
      throw new HttpException(
        { success: false, error: 'Código inválido ou expirado.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Código válido — NÃO consome aqui; só a Etapa 3 consome
    return { success: true }
  }

  async updateProfile(userId: string, data: {
    name?: string
    email?: string
    cargo?: string
    departamento?: string
    hourlyRate?: number
    phone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    notes?: string
    avatarUrl?: string
    signatureUrl?: string
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, role: true, tenantId: true, avatarUrl: true, signatureUrl: true,
        cargo: true, departamento: true, hourlyRate: true, isActive: true, forcePasswordChange: true,
        phone: true, cep: true, logradouro: true, numero: true, complemento: true,
        bairro: true, cidade: true, estado: true, notes: true,
      },
    })
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tenant = await this.resolveTenant(dto.subdomain)
    const user = tenant
      ? await prisma.user.findFirst({
          where: { email: dto.email, tenantId: tenant.id, deletedAt: null },
        })
      : await prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } })

    // Re-valida o código (não confia que a Etapa 2 passou)
    const invalid =
      !user ||
      !user.resetToken ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date() ||
      !compareResetCode(dto.code, user.resetToken)

    if (invalid) {
      throw new HttpException(
        { success: false, error: 'Código inválido ou expirado.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 }, // invalida todas as sessões anteriores
      },
    })

    // Remove contador de tentativas
    await this.redis.delResetAttempts(user!.id)
    // Revogação de sessões: tokenVersion++ já faz o gateway rejeitar tokens antigos.
    // Sessões Redis expiram naturalmente ou são rejeitadas no verify() via tokenVersion.

    return { success: true }
  }

  // ── Multi-tenant user federation ─────────────────────────────────────────────
  // Security model: one physical person can have separate User rows per tenant,
  // all sharing the same verified email. Access between tenants is earned by
  // explicitly calling joinTenant (which requires current auth + new password).
  // switchTenant is only allowed to tenants where a matching User row exists,
  // scoped strictly to the authenticated user's own email (userId → email lookup).

  async getMyTenants(userId: string) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!me) throw new NotFoundException('Usuário não encontrado')

    const users = await prisma.user.findMany({
      where: { email: me.email, deletedAt: null, isActive: true },
      include: { tenant: { select: { name: true, subdomain: true, status: true } } },
    })

    return users
      .filter(u => u.tenant.status === 'ACTIVE')
      .map(u => ({
        userId: u.id,
        tenantId: u.tenantId,
        tenantName: u.tenant.name,
        tenantSubdomain: u.tenant.subdomain,
        role: u.role,
        isCurrent: u.id === userId,
      }))
  }

  async switchTenant(userId: string, targetTenantId: string) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!me) throw new UnauthorizedException('Usuário não encontrado')

    // Defense-in-depth: require both email match AND active status
    const target = await prisma.user.findFirst({
      where: { email: me.email, tenantId: targetTenantId, deletedAt: null, isActive: true },
    })
    // Explicit email assertion — guards against any future query drift
    if (!target || target.email !== me.email) {
      throw new NotFoundException('Usuário não encontrado neste workspace')
    }

    const { token, jti } = await this.jwtService.sign({
      userId: target.id,
      tenantId: target.tenantId,
      role: target.role,
      tokenVersion: target.tokenVersion,
    })

    await this.redis.setSession(jti, {
      userId: target.id,
      tenantId: target.tenantId,
      role: target.role,
      tokenVersion: target.tokenVersion,
    })

    this.logger.log(`AUDIT switchTenant userId=${userId} → tenantId=${targetTenantId} newUserId=${target.id}`)

    return {
      token,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        tenantId: target.tenantId,
      },
    }
  }

  async joinTenant(userId: string, targetTenantId: string, password: string) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (!me) throw new UnauthorizedException('Usuário não encontrado')

    const tenant = await prisma.tenant.findFirst({
      where: { id: targetTenantId, status: 'ACTIVE', deletedAt: null },
    })
    if (!tenant) throw new NotFoundException('Workspace não encontrado ou inativo')

    const existing = await prisma.user.findFirst({
      where: { email: me.email, tenantId: targetTenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Você já possui acesso a este workspace')

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await prisma.user.create({
      data: {
        name: me.name,
        email: me.email,
        passwordHash,
        tenantId: targetTenantId,
        role: 'member',
      },
    })

    this.logger.log(`AUDIT joinTenant userId=${userId} email=${me.email} tenantId=${targetTenantId}`)

    return { ok: true }
  }

  async provisionTenantAdmin(userId: string, targetTenantId: string) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, passwordHash: true, role: true },
    })
    if (!me) throw new UnauthorizedException('Usuário não encontrado')
    if (me.role !== 'admin') throw new ForbiddenException('Apenas administradores podem provisionar workspaces')

    const tenant = await prisma.tenant.findFirst({
      where: { id: targetTenantId, status: 'ACTIVE', deletedAt: null },
    })
    if (!tenant) throw new NotFoundException('Workspace não encontrado ou inativo')

    const existing = await prisma.user.findFirst({
      where: { email: me.email, tenantId: targetTenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Você já possui acesso a este workspace')

    await prisma.user.create({
      data: {
        name: me.name,
        email: me.email,
        passwordHash: me.passwordHash,
        tenantId: targetTenantId,
        role: 'admin',
      },
    })

    this.logger.log(`AUDIT provisionTenantAdmin userId=${userId} email=${me.email} tenantId=${targetTenantId}`)

    return { ok: true }
  }
}
