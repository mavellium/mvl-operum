import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { TenantId } from '../common/tenant-scope'
import { TimeEntryService } from './time-entry.service'

@Controller()
export class TimeEntryController {
  constructor(private readonly timeEntryService: TimeEntryService) {}

  @Get('cards/:cardId/time-entries/total')
  getTotal(@TenantId() tenantId: string, @Param('cardId') cardId: string) {
    return this.timeEntryService.getTotal(tenantId, cardId)
  }

  @Get('cards/:cardId/time-entries/active')
  getActive(@TenantId() tenantId: string, @Param('cardId') cardId: string) {
    return this.timeEntryService.getActive(tenantId, cardId)
  }

  @Get('cards/:cardId/time-entries')
  listByCard(@TenantId() tenantId: string, @Param('cardId') cardId: string) {
    return this.timeEntryService.listByCard(tenantId, cardId)
  }

  @Get('users/:userId/time-entries')
  listByUser(@TenantId() tenantId: string, @Param('userId') userId: string) {
    return this.timeEntryService.listByUser(tenantId, userId)
  }

  @Post('cards/:cardId/time-entries/start')
  start(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { description?: string },
  ) {
    return this.timeEntryService.start(tenantId, cardId, userId, body.description)
  }

  @Post('time-entries/:id/stop')
  stop(@TenantId() tenantId: string, @Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.timeEntryService.stop(tenantId, id, userId)
  }

  @Post('cards/:cardId/time-entries/manual')
  createManual(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { startedAt: string; endedAt: string; description?: string },
  ) {
    if (!body.startedAt || !body.endedAt) throw new BadRequestException('startedAt e endedAt são obrigatórios')
    return this.timeEntryService.createManual(tenantId, cardId, userId, body)
  }

  @Delete('time-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.timeEntryService.remove(tenantId, id)
  }
}
