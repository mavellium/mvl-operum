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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { NoPatGuard } from '../guards/no-pat.guard'

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
  @UseGuards(NoPatGuard)
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
  @UseGuards(NoPatGuard)
  updateUser(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateUser(userId, role, body as Parameters<AdminService['updateUser']>[2])
  }

  @Patch('admin/users/:id/active')
  @UseGuards(NoPatGuard)
  toggleActive(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: { active: boolean },
  ) {
    return this.adminService.toggleActive(userId, role, body.active)
  }

  @Patch('admin/users/:id/role')
  @UseGuards(NoPatGuard)
  setRole(
    @Param('id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.setRole(userId, role, body.role)
  }

  @Get('all-users')
  listAllForTenant(@Headers('x-tenant-id') tenantId: string) {
    // Sem tenant o filtro do Prisma vira `undefined` e listaria usuários de todos os tenants.
    if (!tenantId) throw new UnauthorizedException()
    return this.adminService.listAllForTenant(tenantId)
  }
}
