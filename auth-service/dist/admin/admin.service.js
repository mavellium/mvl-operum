"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const BCRYPT_ROUNDS = 12;
let AdminService = class AdminService {
    requireAdmin(role) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Acesso restrito a administradores');
    }
    async listUsers(tenantId, role) {
        this.requireAdmin(role);
        return prisma_1.prisma.user.findMany({
            where: { tenantId, deletedAt: null },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                avatarUrl: true,
                cargo: true,
                departamento: true,
                hourlyRate: true,
                phone: true,
                cep: true,
                logradouro: true,
                numero: true,
                complemento: true,
                bairro: true,
                cidade: true,
                estado: true,
                notes: true,
                forcePasswordChange: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async createUser(tenantId, role, data) {
        this.requireAdmin(role);
        const existing = await prisma_1.prisma.user.findFirst({
            where: { email: data.email, tenantId, deletedAt: null },
        });
        if (existing)
            throw new common_1.ConflictException('Email já cadastrado');
        const passwordHash = await bcryptjs_1.default.hash(data.password, BCRYPT_ROUNDS);
        const { password: _password, isAdmin: _isAdmin, ...rest } = data;
        return prisma_1.prisma.user.create({
            data: {
                ...rest,
                tenantId,
                passwordHash,
                role: isAdmin ? 'admin' : 'member',
                forcePasswordChange: data.forcePasswordChange ?? false,
            },
        });
    }
    async updateUser(userId, callerRole, data) {
        this.requireAdmin(callerRole);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        const { password, ...rest } = data;
        const updateData = { ...rest };
        if (password)
            updateData.passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
        return prisma_1.prisma.user.update({ where: { id: userId }, data: updateData });
    }
    async toggleActive(userId, callerRole, active) {
        this.requireAdmin(callerRole);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: active,
                ...(active ? {} : { tokenVersion: { increment: 1 } }),
            },
            select: { id: true, name: true, email: true, isActive: true, role: true, tokenVersion: true },
        });
    }
    async setRole(userId, callerRole, role) {
        this.requireAdmin(callerRole);
        if (!['admin', 'member'].includes(role)) {
            throw new common_1.ForbiddenException('Role inválida');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
    }
    async listAllForTenant(tenantId) {
        return prisma_1.prisma.user.findMany({
            where: { tenantId, deletedAt: null },
            select: { id: true, name: true, email: true, avatarUrl: true, role: true, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)()
], AdminService);
//# sourceMappingURL=admin.service.js.map