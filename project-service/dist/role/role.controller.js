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
exports.RoleController = void 0;
const common_1 = require("@nestjs/common");
const role_service_1 = require("./role.service");
let RoleController = class RoleController {
    constructor(roleService) {
        this.roleService = roleService;
    }
    listRoles(tenantId) {
        return this.roleService.listRoles(tenantId);
    }
    findRole(id, tenantId) {
        return this.roleService.findRole(id, tenantId);
    }
    createRole(body, tenantId) {
        const parsed = role_service_1.CreateRoleSchema.safeParse({ ...body, tenantId });
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.roleService.createRole(parsed.data);
    }
    updateRole(id, tenantId, body) {
        const parsed = role_service_1.UpdateRoleSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.roleService.updateRole(id, tenantId, parsed.data);
    }
    deleteRole(id, tenantId) {
        return this.roleService.deleteRole(id, tenantId);
    }
    assignPermission(roleId, permissionId, tenantId) {
        return this.roleService.assignPermission(roleId, tenantId, permissionId);
    }
    removePermission(roleId, permissionId, tenantId) {
        return this.roleService.removePermission(roleId, tenantId, permissionId);
    }
    listPermissions() {
        return this.roleService.listPermissions();
    }
    createPermission(body) {
        const parsed = role_service_1.CreatePermissionSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues[0].message);
        return this.roleService.createPermission(parsed.data);
    }
    getUserProjectRoles(projectId) {
        return this.roleService.getUserProjectRoles(projectId);
    }
    assignUserProjectRole(projectId, body) {
        if (!body.userId || !body.roleId)
            throw new common_1.BadRequestException('userId e roleId são obrigatórios');
        return this.roleService.assignUserProjectRole(body.userId, projectId, body.roleId);
    }
    removeUserProjectRole(projectId, userId) {
        return this.roleService.removeUserProjectRole(userId, projectId);
    }
};
exports.RoleController = RoleController;
__decorate([
    (0, common_1.Get)('roles'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Get)('roles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "findRole", null);
__decorate([
    (0, common_1.Post)('roles'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "createRole", null);
__decorate([
    (0, common_1.Patch)('roles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)('roles/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "deleteRole", null);
__decorate([
    (0, common_1.Post)('roles/:roleId/permissions/:permissionId'),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Param)('permissionId')),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "assignPermission", null);
__decorate([
    (0, common_1.Delete)('roles/:roleId/permissions/:permissionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('roleId')),
    __param(1, (0, common_1.Param)('permissionId')),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "removePermission", null);
__decorate([
    (0, common_1.Get)('permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "listPermissions", null);
__decorate([
    (0, common_1.Post)('permissions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "createPermission", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/roles'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "getUserProjectRoles", null);
__decorate([
    (0, common_1.Post)('projects/:projectId/roles'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "assignUserProjectRole", null);
__decorate([
    (0, common_1.Delete)('projects/:projectId/roles/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "removeUserProjectRole", null);
exports.RoleController = RoleController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [role_service_1.RoleService])
], RoleController);
//# sourceMappingURL=role.controller.js.map