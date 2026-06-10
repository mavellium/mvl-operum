"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
const uuid_1 = require("uuid");
const minio_service_1 = require("../minio/minio.service");
const ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MIME_TO_EXT = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};
const MAX_FILENAME_LENGTH = 255;
const SAFE_FILENAME_RE = /^[^/\\:*?"<>|\x00]+$/;
function assertUser(userId) {
    if (!userId)
        throw new common_1.ForbiddenException('Usuário não identificado');
}
function validateFileName(name) {
    if (!name || name.length > MAX_FILENAME_LENGTH) {
        throw new common_1.BadRequestException(`Nome de arquivo deve ter entre 1 e ${MAX_FILENAME_LENGTH} caracteres`);
    }
    if (!SAFE_FILENAME_RE.test(name)) {
        throw new common_1.BadRequestException('Nome de arquivo contém caracteres inválidos');
    }
}
let UploadService = class UploadService {
    constructor(minio) {
        this.minio = minio;
        this.prisma = prisma_1.prisma;
    }
    async upload(file, cardId, userId) {
        assertUser(userId);
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
        }
        validateFileName(file.originalname);
        const ext = MIME_TO_EXT[file.mimetype] ?? '';
        const key = this.minio.buildKey('uploads', cardId, `${(0, uuid_1.v4)()}${ext}`);
        let fileUrl;
        try {
            fileUrl = await this.minio.upload(key, file.buffer, file.mimetype);
        }
        catch {
            throw new common_1.InternalServerErrorException('Falha no armazenamento');
        }
        try {
            return await this.prisma.attachment.create({
                data: {
                    cardId,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    filePath: fileUrl,
                    fileSize: file.size,
                },
            });
        }
        catch {
            await this.minio.delete(key).catch(() => undefined);
            throw new common_1.InternalServerErrorException('Falha ao registrar o anexo');
        }
    }
    async listByCards(cardIds, userId) {
        assertUser(userId);
        if (cardIds.length === 0)
            return [];
        try {
            return await this.prisma.attachment.findMany({
                where: { cardId: { in: cardIds }, deletedAt: null },
                orderBy: { createdAt: 'asc' },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao buscar anexos');
        }
    }
    async setCover(attachmentId, cardId, userId) {
        assertUser(userId);
        let attachment;
        try {
            attachment = await this.prisma.attachment.findUnique({
                where: { id: attachmentId, deletedAt: null },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao buscar o anexo');
        }
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        try {
            await this.prisma.attachment.updateMany({
                where: { cardId, isCover: true, deletedAt: null },
                data: { isCover: false },
            });
            return await this.prisma.attachment.update({
                where: { id: attachmentId },
                data: { isCover: true },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao definir capa');
        }
    }
    async rename(attachmentId, fileName, userId) {
        assertUser(userId);
        validateFileName(fileName);
        let attachment;
        try {
            attachment = await this.prisma.attachment.findUnique({
                where: { id: attachmentId, deletedAt: null },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao buscar o anexo');
        }
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        try {
            return await this.prisma.attachment.update({
                where: { id: attachmentId },
                data: { fileName, updatedAt: new Date() },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao renomear o anexo');
        }
    }
    async delete(attachmentId, userId) {
        assertUser(userId);
        let attachment;
        try {
            attachment = await this.prisma.attachment.findUnique({
                where: { id: attachmentId, deletedAt: null },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao buscar o anexo');
        }
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        const key = this.minio.extractKey(attachment.filePath);
        if (key)
            await this.minio.delete(key);
        try {
            await this.prisma.attachment.update({
                where: { id: attachmentId },
                data: { deletedAt: new Date() },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao excluir o anexo');
        }
    }
    async getPresignedUrl(attachmentId, userId) {
        assertUser(userId);
        let attachment;
        try {
            attachment = await this.prisma.attachment.findUnique({
                where: { id: attachmentId, deletedAt: null },
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('Erro ao buscar o anexo');
        }
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        const key = this.minio.extractKey(attachment.filePath);
        if (!key)
            return { url: attachment.filePath };
        const url = await this.minio.getPresignedUrl(key, 3600);
        return { url };
    }
    async uploadAvatar(file, userId) {
        assertUser(userId);
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Apenas imagens são permitidas para avatar');
        }
        const ext = MIME_TO_EXT[file.mimetype] ?? '.jpg';
        const key = this.minio.buildKey('avatars', userId, `${userId}${ext}`);
        try {
            const url = await this.minio.upload(key, file.buffer, file.mimetype);
            return { url };
        }
        catch {
            throw new common_1.InternalServerErrorException('Falha no armazenamento');
        }
    }
    async uploadLogo(file, entityId, type) {
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Apenas imagens são permitidas para logo');
        }
        const ext = MIME_TO_EXT[file.mimetype] ?? '.png';
        const key = `logos/${type}s/${entityId}${ext}`;
        try {
            const url = await this.minio.upload(key, file.buffer, file.mimetype);
            return { url };
        }
        catch {
            throw new common_1.InternalServerErrorException('Falha no armazenamento');
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [minio_service_1.MinioService])
], UploadService);
//# sourceMappingURL=upload.service.js.map