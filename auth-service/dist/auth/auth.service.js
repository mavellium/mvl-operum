"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const jwt_service_1 = require("./jwt.service");
const redis_service_1 = require("../redis/redis.service");
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 10;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
function hashResetToken(code) {
    return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
}
function generateCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length }, () => chars[(0, crypto_1.randomInt)(0, chars.length)]).join('');
}
let AuthService = class AuthService {
    constructor(jwtService, redis) {
        this.jwtService = jwtService;
        this.redis = redis;
    }
    async login(dto, subdomain) {
        const tenant = await prisma_1.prisma.tenant.findFirst({
            where: { ...(subdomain ? { subdomain } : {}), status: 'ACTIVE' },
        });
        if (!tenant)
            throw new common_1.UnauthorizedException('Tenant não encontrado');
        const user = await prisma_1.prisma.user.findFirst({
            where: { email: dto.email, tenantId: tenant.id, deletedAt: null },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        if (!user.isActive || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Conta inativa ou bloqueada');
        }
        if ((user.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) {
            throw new common_1.UnauthorizedException('Conta bloqueada por excesso de tentativas. Contate o suporte.');
        }
        const match = await bcryptjs_1.default.compare(dto.password, user.passwordHash);
        if (!match) {
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { loginAttempts: (user.loginAttempts ?? 0) + 1 },
            });
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), loginAttempts: 0 },
        });
        const { token, jti } = await this.jwtService.sign({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
            tokenVersion: user.tokenVersion,
        });
        await this.redis.setSession(jti, {
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
            tokenVersion: user.tokenVersion,
        });
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
        };
    }
    async register(dto) {
        const existing = await prisma_1.prisma.user.findFirst({
            where: { email: dto.email, tenantId: dto.tenantId, deletedAt: null },
        });
        if (existing)
            throw new common_1.ConflictException('Email já cadastrado');
        const passwordHash = await bcryptjs_1.default.hash(dto.password, BCRYPT_ROUNDS);
        const user = await prisma_1.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                passwordHash,
                tenantId: dto.tenantId,
                role: dto.role ?? 'member',
                forcePasswordChange: dto.forcePasswordChange ?? false,
            },
        });
        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }
    async logout(jti) {
        await this.redis.deleteSession(jti);
    }
    async me(userId) {
        const user = await prisma_1.prisma.user.findUnique({
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
        });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        return user;
    }
    async verify(token) {
        const payload = await this.jwtService.verify(token);
        if (!payload)
            throw new common_1.UnauthorizedException('Token inválido');
        if (payload.jti) {
            const session = await this.redis.getSession(payload.jti);
            if (!session)
                throw new common_1.UnauthorizedException('Sessão inválida ou expirada');
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, tokenVersion: true, isActive: true, status: true, deletedAt: true },
        });
        if (!user || user.deletedAt || !user.isActive || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Usuário inativo ou removido');
        }
        if (user.tokenVersion !== payload.tokenVersion) {
            throw new common_1.UnauthorizedException('Sessão invalidada');
        }
        return { userId: payload.userId, tenantId: payload.tenantId, role: payload.role };
    }
    async changePassword(userId, dto) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        const match = await bcryptjs_1.default.compare(dto.currentPassword, user.passwordHash);
        if (!match)
            throw new common_1.ForbiddenException('Senha atual incorreta');
        const passwordHash = await bcryptjs_1.default.hash(dto.newPassword, BCRYPT_ROUNDS);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash, tokenVersion: { increment: 1 } },
        });
    }
    async alterarSenha(userId, newPassword) {
        const passwordHash = await bcryptjs_1.default.hash(newPassword, BCRYPT_ROUNDS);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                forcePasswordChange: false,
                tokenVersion: { increment: 1 },
            },
        });
    }
    async requestPasswordReset(dto) {
        try {
            const user = await prisma_1.prisma.user.findFirst({
                where: { email: dto.email, deletedAt: null },
            });
            if (user) {
                const code = generateCode();
                const expiry = new Date(Date.now() + RESET_CODE_TTL_MS);
                await prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { resetToken: hashResetToken(code), resetTokenExpiry: expiry },
                });
                if (process.env.NODE_ENV !== 'production') {
                    console.info(`[DEV] Reset code for ${dto.email}: ${code}`);
                }
            }
        }
        catch {
        }
        return { success: true };
    }
    async validateResetCode(dto) {
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                email: dto.email,
                deletedAt: null,
                resetToken: hashResetToken(dto.code),
                resetTokenExpiry: { gt: new Date() },
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Código inválido ou expirado');
        return { valid: true };
    }
    async updateProfile(userId, data) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true, name: true, email: true, role: true, tenantId: true, avatarUrl: true,
                cargo: true, departamento: true, hourlyRate: true, isActive: true, forcePasswordChange: true,
                phone: true, cep: true, logradouro: true, numero: true, complemento: true,
                bairro: true, cidade: true, estado: true, notes: true,
            },
        });
    }
    async resetPassword(dto) {
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                email: dto.email,
                deletedAt: null,
                resetToken: hashResetToken(dto.code),
                resetTokenExpiry: { gt: new Date() },
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Código inválido ou expirado');
        const passwordHash = await bcryptjs_1.default.hash(dto.newPassword, BCRYPT_ROUNDS);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
                tokenVersion: { increment: 1 },
            },
        });
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_service_1.JwtService,
        redis_service_1.RedisService])
], AuthService);
//# sourceMappingURL=auth.service.js.map