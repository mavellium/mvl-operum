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
import { TenantId } from '../common/tenant-scope'
import { CommentService } from './comment.service'

@Controller('cards/:cardId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  list(@TenantId() tenantId: string, @Param('cardId') cardId: string) {
    return this.commentService.listByCard(tenantId, cardId)
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string; type?: 'COMMENT' | 'FEEDBACK' },
  ) {
    if (!body.content) throw new BadRequestException('content é obrigatório')
    return this.commentService.create(tenantId, cardId, userId, body.content, body.type)
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string },
  ) {
    if (!body.content) throw new BadRequestException('content é obrigatório')
    return this.commentService.update(tenantId, cardId, id, userId, body.content)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.commentService.remove(tenantId, cardId, id, userId)
  }
}
