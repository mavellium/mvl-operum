"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakeholderService = exports.UpdateStakeholderSchema = exports.CreateStakeholderSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateStakeholderSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    logoUrl: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    competence: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    cep: zod_1.z.string().optional(),
    logradouro: zod_1.z.string().optional(),
    numero: zod_1.z.string().optional(),
    complemento: zod_1.z.string().optional(),
    bairro: zod_1.z.string().optional(),
    cidade: zod_1.z.string().optional(),
    estado: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.UpdateStakeholderSchema = exports.CreateStakeholderSchema.partial().omit({ tenantId: true });
let StakeholderService = class StakeholderService {
    async list(tenantId) {
        return prisma_1.prisma.stakeholder.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, tenantId) {
        const s = await prisma_1.prisma.stakeholder.findFirst({
            where: { id, tenantId },
            include: { projects: { include: { project: true } } },
        });
        if (!s)
            throw new common_1.NotFoundException('Stakeholder não encontrado');
        return s;
    }
    async create(dto) {
        return prisma_1.prisma.stakeholder.create({ data: dto });
    }
    async update(id, tenantId, dto) {
        await this.findOne(id, tenantId);
        return prisma_1.prisma.stakeholder.update({ where: { id }, data: dto });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await prisma_1.prisma.stakeholder.update({ where: { id }, data: { isActive: false } });
    }
    async linkProject(stakeholderId, projectId, tenantId) {
        await this.findOne(stakeholderId, tenantId);
        return prisma_1.prisma.projectStakeholder.upsert({
            where: { projectId_stakeholderId: { projectId, stakeholderId } },
            create: { projectId, stakeholderId },
            update: {},
        });
    }
    async unlinkProject(stakeholderId, projectId, tenantId) {
        await this.findOne(stakeholderId, tenantId);
        await prisma_1.prisma.projectStakeholder.delete({
            where: { projectId_stakeholderId: { projectId, stakeholderId } },
        });
    }
    async listByProject(projectId) {
        return prisma_1.prisma.projectStakeholder.findMany({
            where: { projectId },
            include: { stakeholder: true },
        });
    }
};
exports.StakeholderService = StakeholderService;
exports.StakeholderService = StakeholderService = __decorate([
    (0, common_1.Injectable)()
], StakeholderService);
//# sourceMappingURL=stakeholder.service.js.map