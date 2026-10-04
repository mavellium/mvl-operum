import {
  Controller,
  Headers,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { TenantId } from '../common/tenant-scope'
import { SprintService, CreateSprintSchema, UpdateSprintSchema, CreateColumnSchema } from './sprint.service'

@Controller('sprints')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get()
  list(@TenantId() tenantId: string, @Query('projectId') projectId?: string, @Headers('x-authorized-projects') authorized?: string) {
    return this.sprintService.list(tenantId, projectId, authorized?.split(','))
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sprintService.findOne(tenantId, id)
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() body: unknown) {
    const parsed = CreateSprintSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.create(tenantId, parsed.data)
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateSprintSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.update(tenantId, id, parsed.data)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sprintService.remove(tenantId, id)
  }

  @Get(':id/columns')
  listColumns(@TenantId() tenantId: string, @Param('id') sprintId: string) {
    return this.sprintService.listColumns(tenantId, sprintId)
  }

  @Post(':id/columns')
  createColumn(@TenantId() tenantId: string, @Param('id') sprintId: string, @Body() body: unknown) {
    const parsed = CreateColumnSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.createColumn(tenantId, sprintId, parsed.data)
  }

  @Patch(':id/columns/:columnId')
  updateColumn(
    @TenantId() tenantId: string,
    @Param('id') sprintId: string,
    @Param('columnId') columnId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateColumnSchema.partial().safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.updateColumn(tenantId, sprintId, columnId, parsed.data)
  }

  @Delete(':id/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteColumn(@TenantId() tenantId: string, @Param('id') sprintId: string, @Param('columnId') columnId: string) {
    return this.sprintService.deleteColumn(tenantId, sprintId, columnId)
  }
}
