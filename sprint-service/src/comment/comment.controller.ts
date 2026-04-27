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
import { CommentService } from './comment.service'

@Controller('cards/:cardId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  list(@Param('cardId') cardId: string) {
    return this.commentService.listByCard(cardId)
  }

  @Post()
  create(
    @Param('cardId') cardId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string; type?: 'COMMENT' | 'FEEDBACK' },
  ) {
    if (!body.content) throw new BadRequestException('content é obrigatório')
    return this.commentService.create(cardId, userId, body.content, body.type)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string },
  ) {
    if (!body.content) throw new BadRequestException('content é obrigatório')
    return this.commentService.update(id, userId, body.content)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.commentService.remove(id, userId)
  }
}
