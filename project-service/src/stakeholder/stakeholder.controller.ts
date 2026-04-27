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
import { StakeholderService, CreateStakeholderSchema, UpdateStakeholderSchema } from './stakeholder.service'

@Controller('stakeholders')
export class StakeholderController {
  constructor(private readonly stakeholderService: StakeholderService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.stakeholderService.list(tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.stakeholderService.findOne(id, tenantId)
  }

  @Post()
  create(@Body() body: unknown, @Headers('x-tenant-id') tenantId: string) {
    const parsed = CreateStakeholderSchema.safeParse({ ...(body as object), tenantId })
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.stakeholderService.create(parsed.data)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateStakeholderSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.stakeholderService.update(id, tenantId, parsed.data)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.stakeholderService.remove(id, tenantId)
  }

  @Get('by-project/:projectId')
  listByProject(@Param('projectId') projectId: string) {
    return this.stakeholderService.listByProject(projectId)
  }

  @Post(':id/projects/:projectId')
  linkProject(
    @Param('id') stakeholderId: string,
    @Param('projectId') projectId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.stakeholderService.linkProject(stakeholderId, projectId, tenantId)
  }

  @Delete(':id/projects/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkProject(
    @Param('id') stakeholderId: string,
    @Param('projectId') projectId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.stakeholderService.unlinkProject(stakeholderId, projectId, tenantId)
  }
}
