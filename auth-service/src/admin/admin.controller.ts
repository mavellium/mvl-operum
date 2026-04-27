import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminService } from './admin.service'

@Controller('auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-role') role: string,
  ) {
    return this.adminService.listUsers(tenantId, role)
  }

  @Post('admin/users')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-role') role: string,
    @Body() body: {
      name: string
      email: string
      password: string
      isAdmin?: boolean
      forcePasswordChange?: boolean
      avatarUrl?: string
      phone?: string
      cep?: string
      logradouro?: string
      numero?: string
      complemento?: string
      bairro?: string
      cidade?: string
      estado?: string
      notes?: string
    },
  ) {
    return this.adminService.createUser(tenantId, role, body)
  }

  @Patch('admin/users/:id')
  updateUser(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateUser(userId, role, body as Parameters<AdminService['updateUser']>[2])
  }

  @Patch('admin/users/:id/active')
  toggleActive(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: { active: boolean },
  ) {
    return this.adminService.toggleActive(userId, role, body.active)
  }

  @Patch('admin/users/:id/role')
  setRole(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.setRole(userId, role, body.role)
  }

  @Get('all-users')
  listAllForTenant(@Headers('x-tenant-id') tenantId: string) {
    return this.adminService.listAllForTenant(tenantId)
  }
}
