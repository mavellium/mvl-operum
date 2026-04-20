"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../lib/generated/prisma");
let NotificationService = class NotificationService {
    constructor() {
        this.prisma = new prisma_1.PrismaClient();
    }
    async create(dto) {
        return this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                reference: dto.reference,
                referenceType: dto.referenceType,
            },
        });
    }
    async findAllByUser(userId, status, limit = 50) {
        const where = { userId, deletedAt: null };
        if (status)
            where.status = status;
        return this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async findById(id) {
        const notification = await this.prisma.notification.findUnique({
            where: { id, deletedAt: null },
        });
        if (!notification)
            throw new common_1.NotFoundException('Notification not found');
        return notification;
    }
    async markAsRead(id) {
        await this.findById(id);
        return this.prisma.notification.update({
            where: { id },
            data: { status: 'READ', readAt: new Date() },
        });
    }
    async markAsArchived(id) {
        await this.findById(id);
        return this.prisma.notification.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
    }
    async softDelete(id) {
        await this.findById(id);
        return this.prisma.notification.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async countUnread(userId) {
        return this.prisma.notification.count({
            where: { userId, status: 'UNREAD', deletedAt: null },
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)()
], NotificationService);
//# sourceMappingURL=notification.service.js.map