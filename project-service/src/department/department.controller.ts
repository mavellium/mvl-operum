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
import { DepartmentService, CreateDepartmentSchema, UpdateDepartmentSchema } from './department.service'

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.departmentService.list(tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.departmentService.findOne(id, tenantId)
  }

  @Post()
  create(@Body() body: unknown, @Headers('x-tenant-id') tenantId: string) {
    const parsed = CreateDepartmentSchema.safeParse({ ...(body as object), tenantId })
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.departmentService.create(parsed.data)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateDepartmentSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.departmentService.update(id, tenantId, parsed.data)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.departmentService.remove(id, tenantId)
  }

  @Post(':id/users')
  addUser(
    @Param('id') departmentId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { userId: string },
  ) {
    if (!body.userId) throw new BadRequestException('userId é obrigatório')
    return this.departmentService.addUser(departmentId, tenantId, body.userId)
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUser(
    @Param('id') departmentId: string,
    @Param('userId') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.departmentService.removeUser(departmentId, tenantId, userId)
  }
}
