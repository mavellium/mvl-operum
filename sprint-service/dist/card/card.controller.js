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
exports.CardController = void 0;
const common_1 = require("@nestjs/common");
const card_service_1 = require("./card.service");
let CardController = class CardController {
    constructor(cardService) {
        this.cardService = cardService;
    }
    listBySprint(sprintId) {
        return this.cardService.listBySprint(sprintId);
    }
    findOne(id) {
        return this.cardService.findOne(id);
    }
    create(body) {
        const parsed = card_service_1.CreateCardSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.cardService.create(parsed.data);
    }
    update(id, body) {
        const parsed = card_service_1.UpdateCardSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.cardService.update(id, parsed.data);
    }
    remove(id) {
        return this.cardService.remove(id);
    }
    addTag(cardId, tagId) {
        return this.cardService.addTag(cardId, tagId);
    }
    removeTag(cardId, tagId) {
        return this.cardService.removeTag(cardId, tagId);
    }
    addResponsible(cardId, userId) {
        return this.cardService.addResponsible(cardId, userId);
    }
    removeResponsible(cardId, userId) {
        return this.cardService.removeResponsible(cardId, userId);
    }
    listTags(tenantId) {
        return this.cardService.listTags(tenantId);
    }
    createTag(tenantId, userId, body) {
        if (!body.name)
            throw new common_1.BadRequestException('name é obrigatório');
        return this.cardService.createTag(tenantId, userId, body.name, body.color);
    }
    deleteTag(tagId) {
        return this.cardService.deleteTag(tagId);
    }
};
exports.CardController = CardController;
__decorate([
    (0, common_1.Get)('sprints/:sprintId/cards'),
    __param(0, (0, common_1.Param)('sprintId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "listBySprint", null);
__decorate([
    (0, common_1.Get)('cards/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('cards'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('cards/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('cards/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('cards/:id/tags/:tagId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "addTag", null);
__decorate([
    (0, common_1.Delete)('cards/:id/tags/:tagId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "removeTag", null);
__decorate([
    (0, common_1.Post)('cards/:id/responsibles/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "addResponsible", null);
__decorate([
    (0, common_1.Delete)('cards/:id/responsibles/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "removeResponsible", null);
__decorate([
    (0, common_1.Get)('tags'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "listTags", null);
__decorate([
    (0, common_1.Post)('tags'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "createTag", null);
__decorate([
    (0, common_1.Delete)('tags/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CardController.prototype, "deleteTag", null);
exports.CardController = CardController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [card_service_1.CardService])
], CardController);
//# sourceMappingURL=card.controller.js.map