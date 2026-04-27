"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = exports.UpdateCardSchema = exports.CreateCardSchema = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const zod_1 = require("zod");
exports.CreateCardSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    position: zod_1.z.number().int().optional(),
    sprintId: zod_1.z.string(),
    sprintColumnId: zod_1.z.string().optional(),
    sprintPosition: zod_1.z.number().int().optional(),
    priority: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
exports.UpdateCardSchema = exports.CreateCardSchema.partial();
let CardService = class CardService {
    async listBySprint(sprintId) {
        return prisma_1.prisma.card.findMany({
            where: { sprintId, deletedAt: null },
            include: {
                tags: { include: { tag: true } },
                responsibles: true,
                attachments: { where: { deletedAt: null } },
            },
            orderBy: [{ sprintColumnId: 'asc' }, { position: 'asc' }],
        });
    }
    async findOne(id) {
        const card = await prisma_1.prisma.card.findFirst({
            where: { id, deletedAt: null },
            include: {
                tags: { include: { tag: true } },
                responsibles: true,
                attachments: { where: { deletedAt: null } },
                comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
                timeEntries: { where: { deletedAt: null } },
            },
        });
        if (!card)
            throw new common_1.NotFoundException('Card não encontrado');
        return card;
    }
    async create(dto) {
        return prisma_1.prisma.card.create({
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return prisma_1.prisma.card.update({
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
        await prisma_1.prisma.card.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async addTag(cardId, tagId) {
        await this.findOne(cardId);
        return prisma_1.prisma.cardTag.upsert({
            where: { cardId_tagId: { cardId, tagId } },
            create: { cardId, tagId },
            update: {},
        });
    }
    async removeTag(cardId, tagId) {
        await prisma_1.prisma.cardTag.delete({ where: { cardId_tagId: { cardId, tagId } } });
    }
    async addResponsible(cardId, userId) {
        await this.findOne(cardId);
        return prisma_1.prisma.cardResponsible.upsert({
            where: { cardId_userId: { cardId, userId } },
            create: { cardId, userId },
            update: {},
        });
    }
    async removeResponsible(cardId, userId) {
        await prisma_1.prisma.cardResponsible.delete({ where: { cardId_userId: { cardId, userId } } });
    }
    async listTags(tenantId) {
        return prisma_1.prisma.tag.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    }
    async createTag(tenantId, userId, name, color) {
        return prisma_1.prisma.tag.upsert({
            where: { name_userId: { name, userId } },
            create: { tenantId, userId, name, color: color ?? '#6b7280' },
            update: { color: color ?? '#6b7280' },
        });
    }
    async deleteTag(tagId) {
        await prisma_1.prisma.tag.delete({ where: { id: tagId } });
    }
};
exports.CardService = CardService;
exports.CardService = CardService = __decorate([
    (0, common_1.Injectable)()
], CardService);
//# sourceMappingURL=card.service.js.map