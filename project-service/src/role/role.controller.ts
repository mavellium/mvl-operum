import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { RoleService, CreateRoleSchema, UpdateRoleSchema, CreatePermissionSchema } from './role.service'

@Controller()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // ── Roles ──────────────────────────────────────────────

  @Get('roles')
  listRoles(@Headers('x-tenant-id') tenantId: string) {
    return this.roleService.listRoles(tenantId)
  }

  @Get('roles/:id')
  findRole(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.roleService.findRole(id, tenantId)
  }

  @Post('roles')
  createRole(@Body() body: unknown, @Headers('x-tenant-id') tenantId: string) {
    const parsed = CreateRoleSchema.safeParse({ ...(body as object), tenantId })
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.roleService.createRole(parsed.data)
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateRoleSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.roleService.updateRole(id, tenantId, parsed.data)
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRole(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.roleService.deleteRole(id, tenantId)
  }

  @Post('roles/:roleId/permissions/:permissionId')
  assignPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.roleService.assignPermission(roleId, tenantId, permissionId)
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.roleService.removePermission(roleId, tenantId, permissionId)
  }

  // ── Permissions ────────────────────────────────────────

  @Get('permissions')
  listPermissions() {
    return this.roleService.listPermissions()
  }

  @Post('permissions')
  createPermission(@Body() body: unknown) {
    const parsed = CreatePermissionSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.roleService.createPermission(parsed.data)
  }

  // ── UserProjectRoles ───────────────────────────────────

  @Get('projects/:projectId/roles')
  getUserProjectRoles(@Param('projectId') projectId: string) {
    return this.roleService.getUserProjectRoles(projectId)
  }

  @Post('projects/:projectId/roles')
  assignUserProjectRole(
    @Param('projectId') projectId: string,
    @Body() body: { userId: string; roleId: string },
  ) {
    if (!body.userId || !body.roleId) throw new BadRequestException('userId e roleId são obrigatórios')
    return this.roleService.assignUserProjectRole(body.userId, projectId, body.roleId)
  }

  @Delete('projects/:projectId/roles/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUserProjectRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.roleService.removeUserProjectRole(userId, projectId)
  }
}
