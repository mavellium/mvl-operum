import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import {
  assertCard,
  assertColumn,
  assertProject,
  assertSprint,
  assertTag,
  assertUserInTenant,
  cardInTenant,
  PUBLIC_USER_SELECT,
} from '../common/tenant-scope'
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
  async listBacklog(tenantId: string, projectId: string) {
    await assertProject(tenantId, projectId)
    return prisma.card.findMany({
      where: { projectId, sprintId: null, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: { select: PUBLIC_USER_SELECT } } },
        attachments: { where: { deletedAt: null } },
      },
      orderBy: { position: 'asc' },
    })
  }

  async listBySprint(tenantId: string, sprintId: string) {
    await assertSprint(tenantId, sprintId)
    return prisma.card.findMany({
      where: { sprintId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: { select: PUBLIC_USER_SELECT } } },
        attachments: { where: { deletedAt: null } },
      },
      orderBy: [{ sprintColumnId: 'asc' }, { position: 'asc' }],
    })
  }

  async search(tenantId: string, q: string, opts?: { sprintId?: string; projectId?: string; responsibleUserId?: string }) {
    const where: {
      AND: ReturnType<typeof cardInTenant>[]
      deletedAt: null
      sprintId?: string
      projectId?: string
      responsibles?: { some: { userId: string } }
      OR: (
        | { title: { contains: string; mode: 'insensitive' } }
        | { description: { contains: string; mode: 'insensitive' } }
      )[]
    } = {
      AND: [cardInTenant(tenantId)],
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }
    if (opts?.sprintId) where.sprintId = opts.sprintId
    if (opts?.projectId) where.projectId = opts.projectId
    if (opts?.responsibleUserId) where.responsibles = { some: { userId: opts.responsibleUserId } }

    return prisma.card.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: { select: PUBLIC_USER_SELECT } } },
        attachments: { where: { deletedAt: null } },
        sprint: { select: { id: true, name: true } },
        sprintColumn: { select: { id: true, title: true } },
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findOne(tenantId: string, id: string) {
    const card = await prisma.card.findFirst({
      where: { id, deletedAt: null, ...cardInTenant(tenantId) },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: { select: PUBLIC_USER_SELECT } } },
        attachments: { where: { deletedAt: null } },
        comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } },
        timeEntries: { where: { deletedAt: null } },
      },
    })
    if (!card) throw new NotFoundException('Card não encontrado')
    return card
  }

  /** Valida que projeto, sprint e coluna referenciados pertencem ao tenant e são coerentes entre si. */
  private async assertPlacement(
    tenantId: string,
    placement: { projectId?: string | null; sprintId?: string | null; sprintColumnId?: string | null },
  ) {
    if (placement.projectId) await assertProject(tenantId, placement.projectId)
    if (placement.sprintId) await assertSprint(tenantId, placement.sprintId)
    if (placement.sprintColumnId) {
      if (!placement.sprintId) throw new BadRequestException('sprintColumnId exige sprintId')
      await assertColumn(tenantId, placement.sprintId, placement.sprintColumnId)
    }
  }

  async create(tenantId: string, dto: CreateCardDto) {
    // Card sem projeto nem sprint ficaria fora de qualquer tenant.
    if (!dto.projectId && !dto.sprintId) throw new BadRequestException('projectId ou sprintId é obrigatório')
    await this.assertPlacement(tenantId, dto)
    return prisma.card.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateCardDto) {
    const { reason, userId, ...cardData } = dto
    const current = await this.findOne(tenantId, id)

    const touchesPlacement =
      cardData.projectId !== undefined || cardData.sprintId !== undefined || cardData.sprintColumnId !== undefined
    if (touchesPlacement) {
      await this.assertPlacement(tenantId, {
        projectId: cardData.projectId !== undefined ? cardData.projectId : current.projectId,
        sprintId: cardData.sprintId !== undefined ? cardData.sprintId : current.sprintId,
        sprintColumnId: cardData.sprintColumnId !== undefined ? cardData.sprintColumnId : current.sprintColumnId,
      })
    }

    // Card criado dentro de uma sprint pode não ter projectId; ao voltar para o
    // backlog herda o projeto da sprint, senão sairia do escopo de qualquer tenant.
    if (cardData.sprintId === null && !current.projectId && current.sprintId && cardData.projectId === undefined) {
      const sprint = await prisma.sprint.findUnique({ where: { id: current.sprintId }, select: { projectId: true } })
      if (sprint?.projectId) cardData.projectId = sprint.projectId
    }

    if (cardData.sprintColumnId !== undefined) {
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

  async listMovements(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    return prisma.cardMovement.findMany({
      where: { cardId },
      orderBy: { movedAt: 'asc' },
    })
  }

  async remove(tenantId: string, id: string) {
    await assertCard(tenantId, id)
    await prisma.card.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addTag(tenantId: string, cardId: string, tagId: string) {
    await assertCard(tenantId, cardId)
    await assertTag(tenantId, tagId)
    return prisma.cardTag.upsert({
      where: { cardId_tagId: { cardId, tagId } },
      create: { cardId, tagId },
      update: {},
    })
  }

  async removeTag(tenantId: string, cardId: string, tagId: string) {
    await assertCard(tenantId, cardId)
    await prisma.cardTag.delete({ where: { cardId_tagId: { cardId, tagId } } })
  }

  async addResponsible(tenantId: string, cardId: string, userId: string) {
    await assertCard(tenantId, cardId)
    await assertUserInTenant(tenantId, userId)
    return prisma.cardResponsible.upsert({
      where: { cardId_userId: { cardId, userId } },
      create: { cardId, userId },
      update: {},
    })
  }

  async removeResponsible(tenantId: string, cardId: string, userId: string) {
    await assertCard(tenantId, cardId)
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

  async deleteTag(tenantId: string, tagId: string) {
    await assertTag(tenantId, tagId)
    await prisma.tag.delete({ where: { id: tagId } })
  }
}
