import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { NotificationService } from './notification.service'
import { CreateNotificationSchema } from './dto/create-notification.dto'

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  async create(@Body() body: unknown) {
    const dto = CreateNotificationSchema.parse(body)
    return this.service.create(dto)
  }

  @Get()
  async findAll(
    @Query('userId') userId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllByUser(userId, status, limit ? Number(limit) : undefined)
  }

  @Get('count')
  async count(@Query('userId') userId: string) {
    const count = await this.service.countUnread(userId)
    return { count }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id)
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id)
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  async markAsArchived(@Param('id') id: string) {
    return this.service.markAsArchived(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.service.softDelete(id)
  }
}
