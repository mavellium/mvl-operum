"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
let CommentService = class CommentService {
    async listByCard(cardId) {
        return prisma_1.prisma.comment.findMany({
            where: { cardId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
        });
    }
    async create(cardId, userId, content, type = 'COMMENT') {
        return prisma_1.prisma.comment.create({ data: { cardId, userId, content, type } });
    }
    async update(id, userId, content) {
        const comment = await prisma_1.prisma.comment.findUnique({ where: { id } });
        if (!comment || comment.deletedAt)
            throw new common_1.NotFoundException('Comentário não encontrado');
        if (comment.userId !== userId)
            throw new common_1.ForbiddenException('Sem permissão para editar');
        return prisma_1.prisma.comment.update({ where: { id }, data: { content } });
    }
    async remove(id, userId) {
        const comment = await prisma_1.prisma.comment.findUnique({ where: { id } });
        if (!comment || comment.deletedAt)
            throw new common_1.NotFoundException('Comentário não encontrado');
        if (comment.userId !== userId)
            throw new common_1.ForbiddenException('Sem permissão para remover');
        await prisma_1.prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = __decorate([
    (0, common_1.Injectable)()
], CommentService);
//# sourceMappingURL=comment.service.js.map