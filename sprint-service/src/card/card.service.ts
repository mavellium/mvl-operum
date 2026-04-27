import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().int().optional(),
  sprintId: z.string(),
  sprintColumnId: z.string().optional(),
  sprintPosition: z.number().int().optional(),
  priority: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const UpdateCardSchema = CreateCardSchema.partial()

export type CreateCardDto = z.infer<typeof CreateCardSchema>
export type UpdateCardDto = z.infer<typeof UpdateCardSchema>

@Injectable()
export class CardService {
  async listBySprint(sprintId: string) {
    return prisma.card.findMany({
      where: { sprintId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: true,
        attachments: { where: { deletedAt: null } },
      },
      orderBy: [{ sprintColumnId: 'asc' }, { position: 'asc' }],
    })
  }

  async findOne(id: string) {
    const card = await prisma.card.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: true,
        attachments: { where: { deletedAt: null } },
        comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        timeEntries: { where: { deletedAt: null } },
      },
    })
    if (!card) throw new NotFoundException('Card não encontrado')
    return card
  }

  async create(dto: CreateCardDto) {
    return prisma.card.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async update(id: string, dto: UpdateCardDto) {
    await this.findOne(id)
    return prisma.card.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    await prisma.card.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addTag(cardId: string, tagId: string) {
    await this.findOne(cardId)
    return prisma.cardTag.upsert({
      where: { cardId_tagId: { cardId, tagId } },
      create: { cardId, tagId },
      update: {},
    })
  }

  async removeTag(cardId: string, tagId: string) {
    await prisma.cardTag.delete({ where: { cardId_tagId: { cardId, tagId } } })
  }

  async addResponsible(cardId: string, userId: string) {
    await this.findOne(cardId)
    return prisma.cardResponsible.upsert({
      where: { cardId_userId: { cardId, userId } },
      create: { cardId, userId },
      update: {},
    })
  }

  async removeResponsible(cardId: string, userId: string) {
    await prisma.cardResponsible.delete({ where: { cardId_userId: { cardId, userId } } })
  }

  async listTags(tenantId: string) {
    return prisma.tag.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
  }

  async createTag(tenantId: string, userId: string, name: string, color?: string) {
    return prisma.tag.upsert({
      where: { name_userId: { name, userId } },
      create: { tenantId, userId, name, color: color ?? '#6b7280' },
      update: { color: color ?? '#6b7280' },
    })
  }

  async deleteTag(tagId: string) {
    await prisma.tag.delete({ where: { id: tagId } })
  }
}
