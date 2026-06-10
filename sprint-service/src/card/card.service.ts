import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().int().optional(),
  sprintId: z.string().optional(),
  sprintColumnId: z.string().optional(),
  sprintPosition: z.number().int().optional(),
  projectId: z.string().optional(),
  priority: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const UpdateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().int().optional(),
  sprintId: z.string().nullable().optional(),
  sprintColumnId: z.string().nullable().optional(),
  sprintPosition: z.number().int().nullable().optional(),
  projectId: z.string().optional(),
  priority: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional(),
  userId: z.string().optional(),
})

export type CreateCardDto = z.infer<typeof CreateCardSchema>
export type UpdateCardDto = z.infer<typeof UpdateCardSchema>

@Injectable()
export class CardService {
  async listBacklog(projectId: string) {
    return prisma.card.findMany({
      where: { projectId, sprintId: null, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: true } },
        attachments: { where: { deletedAt: null } },
      },
      orderBy: { position: 'asc' },
    })
  }

  async listBySprint(sprintId: string) {
    return prisma.card.findMany({
      where: { sprintId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: true } },
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
        responsibles: { include: { user: true } },
        attachments: { where: { deletedAt: null } },
        comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } },
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
    const { reason, userId, ...cardData } = dto

    if (cardData.sprintColumnId !== undefined) {
      const current = await this.findOne(id)
      const currentColumnId = (current as { sprintColumnId?: string | null }).sprintColumnId
      if (cardData.sprintColumnId !== currentColumnId) {
        const [fromCol, toCol] = await Promise.all([
          currentColumnId ? prisma.sprintColumn.findUnique({ where: { id: currentColumnId } }) : null,
          cardData.sprintColumnId ? prisma.sprintColumn.findUnique({ where: { id: cardData.sprintColumnId } }) : null,
        ])
        await prisma.cardMovement.create({
          data: {
            cardId: id,
            userId: userId ?? null,
            fromColumnId: currentColumnId ?? null,
            fromColumnTitle: fromCol?.title ?? null,
            toColumnId: cardData.sprintColumnId ?? null,
            toColumnTitle: toCol?.title ?? null,
            reason: reason ?? null,
          },
        })
      }
    }

    return prisma.card.update({
      where: { id },
      data: {
        ...cardData,
        startDate: cardData.startDate ? new Date(cardData.startDate) : undefined,
        endDate: cardData.endDate ? new Date(cardData.endDate) : undefined,
      },
    })
  }

  async listMovements(cardId: string) {
    return prisma.cardMovement.findMany({
      where: { cardId },
      orderBy: { movedAt: 'asc' },
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
