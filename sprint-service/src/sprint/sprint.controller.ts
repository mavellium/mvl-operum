import {
  Controller,
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
import { SprintService, CreateSprintSchema, UpdateSprintSchema, CreateColumnSchema } from './sprint.service'

@Controller('sprints')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get()
  list(@Query('projectId') projectId?: string) {
    return this.sprintService.list(projectId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sprintService.findOne(id)
  }

  @Post()
  create(@Body() body: unknown) {
    const parsed = CreateSprintSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.create(parsed.data)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateSprintSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.update(id, parsed.data)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.sprintService.remove(id)
  }

  @Get(':id/columns')
  listColumns(@Param('id') sprintId: string) {
    return this.sprintService.listColumns(sprintId)
  }

  @Post(':id/columns')
  createColumn(@Param('id') sprintId: string, @Body() body: unknown) {
    const parsed = CreateColumnSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.sprintService.createColumn(sprintId, parsed.data)
  }

  @Patch(':id/columns/:columnId')
  updateColumn(@Param('columnId') columnId: string, @Body() body: { title?: string; position?: number }) {
    return this.sprintService.updateColumn(columnId, body)
  }

  @Delete(':id/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteColumn(@Param('columnId') columnId: string) {
    return this.sprintService.deleteColumn(columnId)
  }
}
