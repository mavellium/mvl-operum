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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const upload_service_1 = require("./upload.service");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
function requireUserId(userId) {
    if (!userId)
        throw new common_1.BadRequestException('x-user-id header é obrigatório');
}
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async upload(file, cardId, userId) {
        requireUserId(userId);
        if (!file)
            throw new common_1.BadRequestException('Arquivo é obrigatório');
        if (!cardId)
            throw new common_1.BadRequestException('cardId é obrigatório');
        return this.uploadService.upload(file, cardId, userId);
    }
    async listByCards(cardIdsParam, userId) {
        requireUserId(userId);
        const cardIds = cardIdsParam ? cardIdsParam.split(',').filter(Boolean) : [];
        return this.uploadService.listByCards(cardIds, userId);
    }
    async setCover(attachmentId, body, userId) {
        requireUserId(userId);
        if (!body.cardId?.trim())
            throw new common_1.BadRequestException('cardId é obrigatório');
        return this.uploadService.setCover(attachmentId, body.cardId.trim(), userId);
    }
    async rename(attachmentId, body, userId) {
        requireUserId(userId);
        if (!body.fileName?.trim())
            throw new common_1.BadRequestException('fileName é obrigatório');
        return this.uploadService.rename(attachmentId, body.fileName.trim(), userId);
    }
    async delete(attachmentId, userId) {
        requireUserId(userId);
        await this.uploadService.delete(attachmentId, userId);
    }
    async getPresignedUrl(attachmentId, userId) {
        requireUserId(userId);
        return this.uploadService.getPresignedUrl(attachmentId, userId);
    }
    async uploadAvatar(file, userId) {
        requireUserId(userId);
        if (!file)
            throw new common_1.BadRequestException('Arquivo é obrigatório');
        return this.uploadService.uploadAvatar(file, userId);
    }
    async uploadLogo(file, entityId, type, userId) {
        requireUserId(userId);
        if (!file)
            throw new common_1.BadRequestException('Arquivo é obrigatório');
        if (!entityId)
            throw new common_1.BadRequestException('entityId é obrigatório');
        return this.uploadService.uploadLogo(file, entityId, type ?? 'project');
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: MAX_FILE_SIZE } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('cardId')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('by-cards'),
    __param(0, (0, common_1.Query)('cardIds')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "listByCards", null);
__decorate([
    (0, common_1.Patch)(':attachmentId/cover'),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "setCover", null);
__decorate([
    (0, common_1.Patch)(':attachmentId'),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "rename", null);
__decorate([
    (0, common_1.Delete)(':attachmentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':attachmentId/url'),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getPresignedUrl", null);
__decorate([
    (0, common_1.Post)('avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: MAX_FILE_SIZE } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Post)('logo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: MAX_FILE_SIZE } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('entityId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadLogo", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map