"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprintService = exports.CreateColumnSchema = exports.UpdateSprintSchema = exports.CreateSprintSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateSprintSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    projectId: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().optional(),
});
exports.UpdateSprintSchema = exports.CreateSprintSchema.partial().extend({
    qualidade: zod_1.z.number().optional(),
    dificuldade: zod_1.z.number().optional(),
});
exports.CreateColumnSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    position: zod_1.z.number().int(),
});
let SprintService = class SprintService {
    async list(projectId) {
        return prisma_1.prisma.sprint.findMany({
            where: { deletedAt: null, ...(projectId ? { projectId } : {}) },
            include: { sprintColumns: { orderBy: { position: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const sprint = await prisma_1.prisma.sprint.findFirst({
            where: { id, deletedAt: null },
            include: {
                sprintColumns: { orderBy: { position: 'asc' } },
                cards: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
            },
        });
        if (!sprint)
            throw new common_1.NotFoundException('Sprint não encontrada');
        return sprint;
    }
    async create(dto) {
        return prisma_1.prisma.sprint.create({
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return prisma_1.prisma.sprint.update({
            where: { id },
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        await prisma_1.prisma.sprint.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async listColumns(sprintId) {
        await this.findOne(sprintId);
        return prisma_1.prisma.sprintColumn.findMany({
            where: { sprintId, deletedAt: null },
            orderBy: { position: 'asc' },
        });
    }
    async createColumn(sprintId, dto) {
        await this.findOne(sprintId);
        return prisma_1.prisma.sprintColumn.create({ data: { sprintId, ...dto } });
    }
    async updateColumn(columnId, dto) {
        return prisma_1.prisma.sprintColumn.update({ where: { id: columnId }, data: dto });
    }
    async deleteColumn(columnId) {
        await prisma_1.prisma.sprintColumn.update({ where: { id: columnId }, data: { deletedAt: new Date() } });
    }
};
exports.SprintService = SprintService;
exports.SprintService = SprintService = __decorate([
    (0, common_1.Injectable)()
], SprintService);
//# sourceMappingURL=sprint.service.js.map