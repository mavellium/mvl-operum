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
let UploadService = class UploadService {
    constructor(minio) {
        this.minio = minio;
        this.prisma = prisma_1.prisma;
    }
    async upload(file, cardId) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
        }
        const ext = file.originalname.includes('.')
            ? `.${file.originalname.split('.').pop().toLowerCase()}`
            : '';
        const safeFileName = `${(0, uuid_1.v4)()}${ext}`;
        const key = this.minio.buildKey('uploads', cardId, safeFileName);
        const fileUrl = await this.minio.upload(key, file.buffer, file.mimetype);
        return this.prisma.attachment.create({
            data: {
                cardId,
                fileName: file.originalname,
                fileType: file.mimetype,
                filePath: fileUrl,
                fileSize: file.size,
            },
        });
    }
    async delete(attachmentId, _userId) {
        const attachment = await this.prisma.attachment.findUnique({
            where: { id: attachmentId, deletedAt: null },
        });
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        const key = this.minio.extractKey(attachment.filePath);
        if (key)
            await this.minio.delete(key);
        await this.prisma.attachment.update({
            where: { id: attachmentId },
            data: { deletedAt: new Date() },
        });
    }
    async getPresignedUrl(attachmentId) {
        const attachment = await this.prisma.attachment.findUnique({
            where: { id: attachmentId, deletedAt: null },
        });
        if (!attachment)
            throw new common_1.NotFoundException('Anexo não encontrado');
        const key = this.minio.extractKey(attachment.filePath);
        if (!key)
            return { url: attachment.filePath };
        const url = await this.minio.getPresignedUrl(key, 3600);
        return { url };
    }
    async uploadAvatar(file, userId) {
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Apenas imagens são permitidas para avatar');
        }
        const ext = file.originalname.includes('.')
            ? `.${file.originalname.split('.').pop().toLowerCase()}`
            : '.jpg';
        const key = this.minio.buildKey('avatars', userId, `${userId}${ext}`);
        const url = await this.minio.upload(key, file.buffer, file.mimetype);
        return { url };
    }
    async uploadLogo(file, entityId, type) {
        if (!file.mimetype.startsWith('image/')) {
            throw new common_1.BadRequestException('Apenas imagens são permitidas para logo');
        }
        const ext = file.originalname.includes('.')
            ? `.${file.originalname.split('.').pop().toLowerCase()}`
            : '.png';
        const key = `logos/${type}s/${entityId}${ext}`;
        const url = await this.minio.upload(key, file.buffer, file.mimetype);
        return { url };
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [minio_service_1.MinioService])
], UploadService);
//# sourceMappingURL=upload.service.js.map