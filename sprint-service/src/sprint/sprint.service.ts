import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertColumn, assertProject, PUBLIC_USER_SELECT, sprintInTenant } from '../common/tenant-scope'
import { z } from 'zod'

export const CreateSprintSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().optional(),
  createdBy: z.string().optional(),
})

export const UpdateSprintSchema = CreateSprintSchema.partial().extend({
  qualidade: z.number().optional(),
  dificuldade: z.number().optional(),
})

export const CreateColumnSchema = z.object({
  title: z.string().min(1),
  position: z.number().int(),
})

export type CreateSprintDto = z.infer<typeof CreateSprintSchema>
export type UpdateSprintDto = z.infer<typeof UpdateSprintSchema>
export type CreateColumnDto = z.infer<typeof CreateColumnSchema>

export const DEFAULT_SPRINT_COLUMNS = ['A Fazer', 'Em andamento', 'Em teste', 'Concluído']

@Injectable()
export class SprintService {
  async list(tenantId: string, projectId?: string, authorized?: string[]) {
    return prisma.sprint.findMany({
      where: { deletedAt: null, ...sprintInTenant(tenantId), ...(projectId ? { projectId } : {}), ...(authorized ? { AND: [{ projectId: { in: authorized } }] } : {}) },
      include: { sprintColumns: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(tenantId: string, id: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id, deletedAt: null, ...sprintInTenant(tenantId) },
      include: {
        sprintColumns: { orderBy: { position: 'asc' } },
        cards: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
      },
    })
    if (!sprint) throw new NotFoundException('Sprint não encontrada')
    return sprint
  }

  async create(tenantId: string, dto: CreateSprintDto) {
    // Sprint sem projeto ficaria fora de qualquer tenant — projectId é obrigatório.
    if (!dto.projectId) throw new BadRequestException('projectId é obrigatório')
    await assertProject(tenantId, dto.projectId)
    const sprint = await prisma.sprint.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })

    // Colunas padrão além do backlog — A Fazer, Em andamento, Em teste, Concluído.
    await prisma.sprintColumn.createMany({
      data: DEFAULT_SPRINT_COLUMNS.map((title, position) => ({ title, position, sprintId: sprint.id })),
    })

    return sprint
  }

  async update(tenantId: string, id: string, dto: UpdateSprintDto) {
    await this.findOne(tenantId, id)
    if (dto.projectId) await assertProject(tenantId, dto.projectId)
    return prisma.sprint.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    // Devolver todos os cards ao backlog ao deletar a sprint
    await prisma.card.updateMany({
      where: { sprintId: id, deletedAt: null },
      data: { sprintId: null, sprintColumnId: null, sprintPosition: null },
    })
    await prisma.sprint.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async listColumns(tenantId: string, sprintId: string) {
    await this.findOne(tenantId, sprintId)
    return prisma.sprintColumn.findMany({
      where: { sprintId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        cards: {
          where: { deletedAt: null },
          orderBy: { sprintPosition: 'asc' },
          include: {
            tags: { include: { tag: true } },
            responsibles: { include: { user: { select: PUBLIC_USER_SELECT } } },
            timeEntries: { where: { deletedAt: null } },
          },
        },
      },
    })
  }

  async createColumn(tenantId: string, sprintId: string, dto: CreateColumnDto) {
    await this.findOne(tenantId, sprintId)
    return prisma.sprintColumn.create({ data: { sprintId, ...dto } })
  }

  async updateColumn(tenantId: string, sprintId: string, columnId: string, dto: Partial<CreateColumnDto>) {
    await assertColumn(tenantId, sprintId, columnId)
    return prisma.sprintColumn.update({ where: { id: columnId }, data: dto })
  }

  async deleteColumn(tenantId: string, sprintId: string, columnId: string) {
    await assertColumn(tenantId, sprintId, columnId)
    await prisma.sprintColumn.update({ where: { id: columnId }, data: { deletedAt: new Date() } })
  }
}
