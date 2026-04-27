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
import { TimeEntryService } from './time-entry.service'

@Controller()
export class TimeEntryController {
  constructor(private readonly timeEntryService: TimeEntryService) {}

  @Get('cards/:cardId/time-entries')
  listByCard(@Param('cardId') cardId: string) {
    return this.timeEntryService.listByCard(cardId)
  }

  @Get('users/:userId/time-entries')
  listByUser(@Param('userId') userId: string) {
    return this.timeEntryService.listByUser(userId)
  }

  @Post('cards/:cardId/time-entries/start')
  start(
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { description?: string },
  ) {
    return this.timeEntryService.start(cardId, userId, body.description)
  }

  @Post('time-entries/:id/stop')
  stop(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.timeEntryService.stop(id, userId)
  }

  @Post('cards/:cardId/time-entries/manual')
  createManual(
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { startedAt: string; endedAt: string; description?: string },
  ) {
    if (!body.startedAt || !body.endedAt) throw new BadRequestException('startedAt e endedAt são obrigatórios')
    return this.timeEntryService.createManual(cardId, userId, body)
  }

  @Delete('time-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.timeEntryService.remove(id)
  }
}
