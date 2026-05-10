import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().int().optional(),
  sprintId: z.string().nullable().optional(),
  sprintColumnId: z.string().nullable().optional(),
  sprintPosition: z.number().int().nullable().optional(),
  status: z.string().optional(),
  projectId: z.string().nullable().optional(),
  priority: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // Orçado
  orcado_min: z.number().int().nullable().optional(),
  data_prevista: z.string().datetime().nullable().optional(),
  // Realizado
  realizado_min: z.number().int().nullable().optional(),
  data_realizacao: z.string().datetime().nullable().optional(),
})

export const UpdateCardSchema = CreateCardSchema.partial()

export type CreateCardDto = z.infer<typeof CreateCardSchema>
export type UpdateCardDto = z.infer<typeof UpdateCardSchema>

function calcularDerivados(minutos: number, horasDiarias: number, remuneracao: number) {
  if (horasDiarias === 0) return { horas: minutos / 60, dias: 0, valorPorMinuto: 0, total: 0 }
  const horas = minutos / 60
  const dias = horas / horasDiarias
  const valorPorMinuto = remuneracao / (horasDiarias * 60)
  return { horas, dias, valorPorMinuto, total: minutos * valorPorMinuto }
}

function calcularSituacaoStatus(dataRealizacao: Date, dataPrevista: Date): string {
  const r = new Date(dataRealizacao).setHours(0, 0, 0, 0)
  const p = new Date(dataPrevista).setHours(0, 0, 0, 0)
  if (r < p) return 'Antecipada'
  if (r === p) return 'No prazo'
  return 'Atrasada'
}

@Injectable()
export class CardService {
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

  async listBacklog(projectId: string) {
    return prisma.card.findMany({
      where: { projectId, status: 'Backlog', sprintId: null, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: true } },
        attachments: { where: { deletedAt: null } },
        timeEntries: { where: { deletedAt: null } },
      },
      orderBy: { position: 'asc' },
    })
  }

  async findOne(id: string) {
    const card = await prisma.card.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        responsibles: { include: { user: true } },
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
    const card = await this.findOne(id)

    const extraData: Record<string, unknown> = {}

    // Calcular derivados de orçado
    const orcadoMin = dto.orcado_min ?? card.orcado_min
    if (orcadoMin != null && (dto.orcado_min !== undefined)) {
      const responsible = card.responsibles?.[0]
      if (responsible) {
        const userProject = await prisma.userProject.findFirst({
          where: { userId: responsible.userId, active: true },
          select: { horasDiarias: true, remuneracao: true },
        }).catch(() => null)
        if (userProject?.horasDiarias && userProject.horasDiarias > 0) {
          const d = calcularDerivados(orcadoMin, userProject.horasDiarias, userProject.remuneracao ?? 0)
          extraData.orcado_horas = d.horas
          extraData.orcado_dias = d.dias
          extraData.orcado_total = d.total
        }
      }
    }

    // Calcular derivados de realizado
    const realizadoMin = dto.realizado_min ?? card.realizado_min
    if (realizadoMin != null && dto.realizado_min !== undefined) {
      const responsible = card.responsibles?.[0]
      if (responsible) {
        const userProject = await prisma.userProject.findFirst({
          where: { userId: responsible.userId, active: true },
          select: { horasDiarias: true, remuneracao: true },
        }).catch(() => null)
        if (userProject?.horasDiarias && userProject.horasDiarias > 0) {
          const d = calcularDerivados(realizadoMin, userProject.horasDiarias, userProject.remuneracao ?? 0)
          extraData.realizado_horas = d.horas
          extraData.realizado_dias = d.dias
          extraData.realizado_total = d.total
        }
      }
    }

    // Calcular situacao_status quando ambas as datas estão presentes
    const dataRealizacao = dto.data_realizacao ? new Date(dto.data_realizacao) : card.data_realizacao
    const dataPrevista = dto.data_prevista ? new Date(dto.data_prevista) : card.data_prevista
    if (dataRealizacao && dataPrevista) {
      extraData.situacao_status = calcularSituacaoStatus(dataRealizacao, dataPrevista)
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        data_prevista: dto.data_prevista ? new Date(dto.data_prevista) : undefined,
        data_realizacao: dto.data_realizacao ? new Date(dto.data_realizacao) : undefined,
        ...extraData,
      },
    })

    // Notificar quando tempo realizado ultrapassa o orçado
    const finalRealizado = updated.realizado_min ?? 0
    const finalOrcado = updated.orcado_min ?? 0
    if (finalRealizado > 0 && finalOrcado > 0 && finalRealizado > finalOrcado) {
      const responsibleIds = card.responsibles?.map((r: { userId: string }) => r.userId) ?? []
      if (responsibleIds.length > 0) {
        const notifData = responsibleIds.map((userId: string) => ({
          userId,
          type: 'UPDATE',
          title: 'Tempo realizado excede o planejado',
          message: `O card "${updated.title}" ultrapassou o tempo orçado (${finalOrcado}min planejados, ${finalRealizado}min realizados).`,
          reference: updated.id,
          referenceType: 'card',
        }))
        await prisma.notification.createMany({ data: notifData }).catch(() => null)
      }
    }

    return updated
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
