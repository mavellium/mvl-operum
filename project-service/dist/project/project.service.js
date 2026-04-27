"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = exports.UpdateProjectSchema = exports.CreateProjectSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateProjectSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    logoUrl: zod_1.z.string().optional(),
    slogan: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    justificativa: zod_1.z.string().optional(),
    objetivos: zod_1.z.string().optional(),
    metodologia: zod_1.z.string().optional(),
    descricaoProduto: zod_1.z.string().optional(),
    premissas: zod_1.z.string().optional(),
    restricoes: zod_1.z.string().optional(),
    limitesAutoridade: zod_1.z.string().optional(),
    semestre: zod_1.z.string().optional(),
    ano: zod_1.z.number().int().optional(),
    departamentos: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.UpdateProjectSchema = exports.CreateProjectSchema.partial().omit({ tenantId: true });
let ProjectService = class ProjectService {
    async list(tenantId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma_1.prisma.project.findMany({
                where: { tenantId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.project.count({ where: { tenantId, deletedAt: null } }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id, tenantId) {
        const project = await prisma_1.prisma.project.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                members: true,
                macroFases: true,
                stakeholders: { include: { stakeholder: true } },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('Projeto não encontrado');
        return project;
    }
    async create(dto) {
        const existing = await prisma_1.prisma.project.findFirst({
            where: { name: dto.name, tenantId: dto.tenantId, deletedAt: null },
        });
        if (existing)
            throw new common_1.ConflictException('Projeto com esse nome já existe');
        return prisma_1.prisma.project.create({
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
                departamentos: dto.departamentos ?? [],
            },
        });
    }
    async update(id, tenantId, dto) {
        await this.findOne(id, tenantId);
        return prisma_1.prisma.project.update({
            where: { id },
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            },
        });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await prisma_1.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async getMembers(projectId, tenantId) {
        await this.findOne(projectId, tenantId);
        return prisma_1.prisma.userProject.findMany({
            where: { projectId, active: true },
        });
    }
    async addMember(projectId, tenantId, userId, data) {
        await this.findOne(projectId, tenantId);
        return prisma_1.prisma.userProject.upsert({
            where: { userId_projectId: { userId, projectId } },
            create: { userId, projectId, ...data },
            update: { active: true, ...data },
        });
    }
    async removeMember(projectId, tenantId, userId) {
        await this.findOne(projectId, tenantId);
        await prisma_1.prisma.userProject.update({
            where: { userId_projectId: { userId, projectId } },
            data: { active: false },
        });
    }
    async getUserActiveProjects(userId, tenantId) {
        return prisma_1.prisma.userProject.findMany({
            where: { userId, active: true, project: { tenantId, deletedAt: null } },
            include: { project: { select: { id: true, name: true, status: true } } },
        });
    }
    async listMacroFases(projectId, tenantId) {
        await this.findOne(projectId, tenantId);
        return prisma_1.prisma.projectMacroFase.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
    }
    async upsertMacroFase(projectId, tenantId, fases) {
        await this.findOne(projectId, tenantId);
        await prisma_1.prisma.projectMacroFase.deleteMany({ where: { projectId } });
        return prisma_1.prisma.projectMacroFase.createMany({
            data: fases.map(f => ({ projectId, ...f })),
        });
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = __decorate([
    (0, common_1.Injectable)()
], ProjectService);
//# sourceMappingURL=project.service.js.map