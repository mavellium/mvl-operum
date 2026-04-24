"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
let TimeEntryService = class TimeEntryService {
    async listByCard(cardId) {
        return prisma_1.prisma.timeEntry.findMany({
            where: { cardId, deletedAt: null },
            orderBy: { startedAt: 'desc' },
        });
    }
    async listByUser(userId) {
        return prisma_1.prisma.timeEntry.findMany({
            where: { userId, deletedAt: null },
            orderBy: { startedAt: 'desc' },
        });
    }
    async start(cardId, userId, description) {
        const running = await prisma_1.prisma.timeEntry.findFirst({
            where: { userId, isRunning: true, deletedAt: null },
        });
        if (running)
            throw new common_1.BadRequestException('Já existe um timer em andamento');
        return prisma_1.prisma.timeEntry.create({
            data: { cardId, userId, isRunning: true, description },
        });
    }
    async stop(id, userId) {
        const entry = await prisma_1.prisma.timeEntry.findUnique({ where: { id } });
        if (!entry || entry.deletedAt || entry.userId !== userId) {
            throw new common_1.NotFoundException('Time entry não encontrada');
        }
        const endedAt = new Date();
        const duration = Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000);
        return prisma_1.prisma.timeEntry.update({
            where: { id },
            data: { endedAt, duration, isRunning: false },
        });
    }
    async createManual(cardId, userId, data) {
        const start = new Date(data.startedAt);
        const end = new Date(data.endedAt);
        const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
        return prisma_1.prisma.timeEntry.create({
            data: { cardId, userId, startedAt: start, endedAt: end, duration, isManual: true, description: data.description },
        });
    }
    async remove(id) {
        const entry = await prisma_1.prisma.timeEntry.findUnique({ where: { id } });
        if (!entry)
            throw new common_1.NotFoundException('Time entry não encontrada');
        await prisma_1.prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.TimeEntryService = TimeEntryService;
exports.TimeEntryService = TimeEntryService = __decorate([
    (0, common_1.Injectable)()
], TimeEntryService);
//# sourceMappingURL=time-entry.service.js.map