import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { ProjectService, CreateProjectSchema, UpdateProjectSchema } from './project.service'

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectService.list(tenantId, Number(page ?? 1), Number(limit ?? 20))
  }

  @Get('user/:userId')
  getUserProjects(
    @Param('userId') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.projectService.getUserActiveProjects(userId, tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.projectService.findOne(id, tenantId)
  }

  @Post()
  create(@Body() body: unknown, @Headers('x-tenant-id') tenantId: string) {
    const parsed = CreateProjectSchema.safeParse({ ...(body as object), tenantId })
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.projectService.create(parsed.data)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.projectService.update(id, tenantId, parsed.data)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.projectService.remove(id, tenantId)
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.projectService.getMembers(id, tenantId)
  }

  @Post(':id/members')
  addMember(
    @Param('id') projectId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { userId: string; role?: string; departmentId?: string; hourlyRate?: number },
  ) {
    if (!body.userId) throw new BadRequestException('userId é obrigatório')
    return this.projectService.addMember(projectId, tenantId, body.userId, body)
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.projectService.removeMember(projectId, tenantId, userId)
  }

  @Get(':id/macro-fases')
  listMacroFases(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.projectService.listMacroFases(id, tenantId)
  }

  @Post(':id/macro-fases')
  upsertMacroFases(
    @Param('id') projectId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { fases: { fase: string; dataLimite?: string; custo?: string }[] },
  ) {
    return this.projectService.upsertMacroFase(projectId, tenantId, body.fases ?? [])
  }
}
