"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = exports.CreatePermissionSchema = exports.UpdateRoleSchema = exports.CreateRoleSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateRoleSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    nameKey: zod_1.z.string().min(1),
    scope: zod_1.z.enum(['TENANT', 'PROJETO']),
    description: zod_1.z.string().optional(),
});
exports.UpdateRoleSchema = exports.CreateRoleSchema.partial().omit({ tenantId: true });
exports.CreatePermissionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    resource: zod_1.z.string().min(1),
    action: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
let RoleService = class RoleService {
    async listRoles(tenantId) {
        return prisma_1.prisma.role.findMany({
            where: { tenantId, deletedAt: null },
            include: { permissions: { include: { permission: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async findRole(id, tenantId) {
        const role = await prisma_1.prisma.role.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: { permissions: { include: { permission: true } } },
        });
        if (!role)
            throw new common_1.NotFoundException('Role não encontrada');
        return role;
    }
    async createRole(dto) {
        const existing = await prisma_1.prisma.role.findFirst({
            where: { nameKey: dto.nameKey, tenantId: dto.tenantId, scope: dto.scope, deletedAt: null },
        });
        if (existing)
            throw new common_1.ConflictException('Role com esse nameKey já existe para este tenant/escopo');
        return prisma_1.prisma.role.create({ data: dto });
    }
    async updateRole(id, tenantId, dto) {
        await this.findRole(id, tenantId);
        return prisma_1.prisma.role.update({ where: { id }, data: dto });
    }
    async deleteRole(id, tenantId) {
        await this.findRole(id, tenantId);
        await prisma_1.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async assignPermission(roleId, tenantId, permissionId) {
        await this.findRole(roleId, tenantId);
        return prisma_1.prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId, permissionId } },
            create: { roleId, permissionId },
            update: {},
        });
    }
    async removePermission(roleId, tenantId, permissionId) {
        await this.findRole(roleId, tenantId);
        await prisma_1.prisma.rolePermission.delete({
            where: { roleId_permissionId: { roleId, permissionId } },
        });
    }
    async listPermissions() {
        return prisma_1.prisma.permission.findMany({
            where: { deletedAt: null },
            orderBy: [{ resource: 'asc' }, { action: 'asc' }],
        });
    }
    async createPermission(dto) {
        const existing = await prisma_1.prisma.permission.findFirst({
            where: { resource: dto.resource, action: dto.action },
        });
        if (existing)
            throw new common_1.ConflictException('Permissão já existe');
        return prisma_1.prisma.permission.create({ data: dto });
    }
    async assignUserProjectRole(userId, projectId, roleId) {
        return prisma_1.prisma.userProjectRole.upsert({
            where: { userId_projectId: { userId, projectId } },
            create: { userId, projectId, roleId },
            update: { roleId },
        });
    }
    async removeUserProjectRole(userId, projectId) {
        await prisma_1.prisma.userProjectRole.update({
            where: { userId_projectId: { userId, projectId } },
            data: { deletedAt: new Date() },
        });
    }
    async getUserProjectRoles(projectId) {
        return prisma_1.prisma.userProjectRole.findMany({
            where: { projectId, deletedAt: null },
            include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, common_1.Injectable)()
], RoleService);
//# sourceMappingURL=role.service.js.map