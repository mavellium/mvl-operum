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
exports.TimeEntryController = void 0;
const common_1 = require("@nestjs/common");
const time_entry_service_1 = require("./time-entry.service");
let TimeEntryController = class TimeEntryController {
    constructor(timeEntryService) {
        this.timeEntryService = timeEntryService;
    }
    listByCard(cardId) {
        return this.timeEntryService.listByCard(cardId);
    }
    listByUser(userId) {
        return this.timeEntryService.listByUser(userId);
    }
    start(cardId, userId, body) {
        return this.timeEntryService.start(cardId, userId, body.description);
    }
    stop(id, userId) {
        return this.timeEntryService.stop(id, userId);
    }
    createManual(cardId, userId, body) {
        if (!body.startedAt || !body.endedAt)
            throw new common_1.BadRequestException('startedAt e endedAt são obrigatórios');
        return this.timeEntryService.createManual(cardId, userId, body);
    }
    remove(id) {
        return this.timeEntryService.remove(id);
    }
};
exports.TimeEntryController = TimeEntryController;
__decorate([
    (0, common_1.Get)('cards/:cardId/time-entries'),
    __param(0, (0, common_1.Param)('cardId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "listByCard", null);
__decorate([
    (0, common_1.Get)('users/:userId/time-entries'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "listByUser", null);
__decorate([
    (0, common_1.Post)('cards/:cardId/time-entries/start'),
    __param(0, (0, common_1.Param)('cardId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('time-entries/:id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "stop", null);
__decorate([
    (0, common_1.Post)('cards/:cardId/time-entries/manual'),
    __param(0, (0, common_1.Param)('cardId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "createManual", null);
__decorate([
    (0, common_1.Delete)('time-entries/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimeEntryController.prototype, "remove", null);
exports.TimeEntryController = TimeEntryController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [time_entry_service_1.TimeEntryService])
], TimeEntryController);
//# sourceMappingURL=time-entry.controller.js.map