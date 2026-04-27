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
exports.SprintController = void 0;
const common_1 = require("@nestjs/common");
const sprint_service_1 = require("./sprint.service");
let SprintController = class SprintController {
    constructor(sprintService) {
        this.sprintService = sprintService;
    }
    list(projectId) {
        return this.sprintService.list(projectId);
    }
    findOne(id) {
        return this.sprintService.findOne(id);
    }
    create(body) {
        const parsed = sprint_service_1.CreateSprintSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.sprintService.create(parsed.data);
    }
    update(id, body) {
        const parsed = sprint_service_1.UpdateSprintSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.sprintService.update(id, parsed.data);
    }
    remove(id) {
        return this.sprintService.remove(id);
    }
    listColumns(sprintId) {
        return this.sprintService.listColumns(sprintId);
    }
    createColumn(sprintId, body) {
        const parsed = sprint_service_1.CreateColumnSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.sprintService.createColumn(sprintId, parsed.data);
    }
    updateColumn(columnId, body) {
        return this.sprintService.updateColumn(columnId, body);
    }
    deleteColumn(columnId) {
        return this.sprintService.deleteColumn(columnId);
    }
};
exports.SprintController = SprintController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/columns'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "listColumns", null);
__decorate([
    (0, common_1.Post)(':id/columns'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "createColumn", null);
__decorate([
    (0, common_1.Patch)(':id/columns/:columnId'),
    __param(0, (0, common_1.Param)('columnId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "updateColumn", null);
__decorate([
    (0, common_1.Delete)(':id/columns/:columnId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('columnId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SprintController.prototype, "deleteColumn", null);
exports.SprintController = SprintController = __decorate([
    (0, common_1.Controller)('sprints'),
    __metadata("design:paramtypes", [sprint_service_1.SprintService])
], SprintController);
//# sourceMappingURL=sprint.controller.js.map