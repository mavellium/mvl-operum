import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { CardService, CreateCardSchema, UpdateCardSchema } from './card.service'


@Controller()
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('sprints/:sprintId/cards')
  listBySprint(@Param('sprintId') sprintId: string) {
    return this.cardService.listBySprint(sprintId)
  }

  @Get('cards/backlog')
  listBacklog(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId é obrigatório')
    return this.cardService.listBacklog(projectId)
  }

  // Declarada ANTES de @Get('cards/:id') para não colidir com o parâmetro
  // dinâmico (senão "search" vira o :id e cai em findOne).
  @Get('cards/search')
  search(
    @Query('q') q?: string,
    @Query('sprintId') sprintId?: string,
    @Query('projectId') projectId?: string,
    @Query('responsibleUserId') responsibleUserId?: string,
  ) {
    if (!q || q.trim().length < 2) throw new BadRequestException('q é obrigatório (mínimo 2 caracteres)')
    return this.cardService.search(q.trim(), { sprintId, projectId, responsibleUserId })
  }

  @Get('cards/:id')
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id)
  }

  @Post('cards')
  create(@Body() body: unknown) {
    const parsed = CreateCardSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.cardService.create(parsed.data)
  }

  @Get('cards/:id/movements')
  listMovements(@Param('id') id: string) {
    return this.cardService.listMovements(id)
  }

  @Patch('cards/:id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('x-user-id') userId?: string,
  ) {
    const parsed = UpdateCardSchema.safeParse({ ...(body as object), userId })
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0].message)
    return this.cardService.update(id, parsed.data)
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.cardService.remove(id)
  }

  @Post('cards/:id/tags/:tagId')
  addTag(@Param('id') cardId: string, @Param('tagId') tagId: string) {
    return this.cardService.addTag(cardId, tagId)
  }

  @Delete('cards/:id/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(@Param('id') cardId: string, @Param('tagId') tagId: string) {
    return this.cardService.removeTag(cardId, tagId)
  }

  @Post('cards/:id/responsibles/:userId')
  addResponsible(@Param('id') cardId: string, @Param('userId') userId: string) {
    return this.cardService.addResponsible(cardId, userId)
  }

  @Delete('cards/:id/responsibles/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeResponsible(@Param('id') cardId: string, @Param('userId') userId: string) {
    return this.cardService.removeResponsible(cardId, userId)
  }

  @Get('tags')
  listTags(@Headers('x-tenant-id') tenantId: string) {
    return this.cardService.listTags(tenantId)
  }

  @Post('tags')
  createTag(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string; color?: string },
  ) {
    if (!body.name) throw new BadRequestException('name é obrigatório')
    return this.cardService.createTag(tenantId, userId, body.name, body.color)
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTag(@Param('id') tagId: string) {
    return this.cardService.deleteTag(tagId)
  }
}
