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
exports.StakeholderController = void 0;
const common_1 = require("@nestjs/common");
const stakeholder_service_1 = require("./stakeholder.service");
let StakeholderController = class StakeholderController {
    constructor(stakeholderService) {
        this.stakeholderService = stakeholderService;
    }
    list(tenantId) {
        return this.stakeholderService.list(tenantId);
    }
    findOne(id, tenantId) {
        return this.stakeholderService.findOne(id, tenantId);
    }
    create(body, tenantId) {
        const parsed = stakeholder_service_1.CreateStakeholderSchema.safeParse({ ...body, tenantId });
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.stakeholderService.create(parsed.data);
    }
    update(id, tenantId, body) {
        const parsed = stakeholder_service_1.UpdateStakeholderSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.stakeholderService.update(id, tenantId, parsed.data);
    }
    remove(id, tenantId) {
        return this.stakeholderService.remove(id, tenantId);
    }
    listByProject(projectId) {
        return this.stakeholderService.listByProject(projectId);
    }
    linkProject(stakeholderId, projectId, tenantId) {
        return this.stakeholderService.linkProject(stakeholderId, projectId, tenantId);
    }
    unlinkProject(stakeholderId, projectId, tenantId) {
        return this.stakeholderService.unlinkProject(stakeholderId, projectId, tenantId);
    }
};
exports.StakeholderController = StakeholderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('by-project/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "listByProject", null);
__decorate([
    (0, common_1.Post)(':id/projects/:projectId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "linkProject", null);
__decorate([
    (0, common_1.Delete)(':id/projects/:projectId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StakeholderController.prototype, "unlinkProject", null);
exports.StakeholderController = StakeholderController = __decorate([
    (0, common_1.Controller)('stakeholders'),
    __metadata("design:paramtypes", [stakeholder_service_1.StakeholderService])
], StakeholderController);
//# sourceMappingURL=stakeholder.controller.js.map