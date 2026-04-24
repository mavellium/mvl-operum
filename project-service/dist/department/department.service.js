"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = exports.UpdateDepartmentSchema = exports.CreateDepartmentSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateDepartmentSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    hourlyRate: zod_1.z.number().optional(),
});
exports.UpdateDepartmentSchema = exports.CreateDepartmentSchema.partial().omit({ tenantId: true });
let DepartmentService = class DepartmentService {
    async list(tenantId) {
        return prisma_1.prisma.department.findMany({
            where: { tenantId, deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, tenantId) {
        const dept = await prisma_1.prisma.department.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: { users: true },
        });
        if (!dept)
            throw new common_1.NotFoundException('Departamento não encontrado');
        return dept;
    }
    async create(dto) {
        const existing = await prisma_1.prisma.department.findFirst({
            where: { name: dto.name, tenantId: dto.tenantId, deletedAt: null },
        });
        if (existing)
            throw new common_1.ConflictException('Departamento com esse nome já existe');
        return prisma_1.prisma.department.create({ data: dto });
    }
    async update(id, tenantId, dto) {
        await this.findOne(id, tenantId);
        return prisma_1.prisma.department.update({ where: { id }, data: dto });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await prisma_1.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async addUser(departmentId, tenantId, userId) {
        await this.findOne(departmentId, tenantId);
        return prisma_1.prisma.userDepartment.upsert({
            where: { userId_departmentId: { userId, departmentId } },
            create: { userId, departmentId },
            update: {},
        });
    }
    async removeUser(departmentId, tenantId, userId) {
        await this.findOne(departmentId, tenantId);
        await prisma_1.prisma.userDepartment.delete({
            where: { userId_departmentId: { userId, departmentId } },
        });
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = __decorate([
    (0, common_1.Injectable)()
], DepartmentService);
//# sourceMappingURL=department.service.js.map