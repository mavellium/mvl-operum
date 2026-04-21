import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
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

@Injectable()
export class SprintService {
  async list(projectId?: string) {
    return prisma.sprint.findMany({
      where: { deletedAt: null, ...(projectId ? { projectId } : {}) },
      include: { sprintColumns: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id, deletedAt: null },
      include: {
        sprintColumns: { orderBy: { position: 'asc' } },
        cards: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
      },
    })
    if (!sprint) throw new NotFoundException('Sprint não encontrada')
    return sprint
  }

  async create(dto: CreateSprintDto) {
    return prisma.sprint.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOne(id)
    return prisma.sprint.update({
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
    await prisma.sprint.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async listColumns(sprintId: string) {
    await this.findOne(sprintId)
    return prisma.sprintColumn.findMany({
      where: { sprintId, deletedAt: null },
      orderBy: { position: 'asc' },
    })
  }

  async createColumn(sprintId: string, dto: CreateColumnDto) {
    await this.findOne(sprintId)
    return prisma.sprintColumn.create({ data: { sprintId, ...dto } })
  }

  async updateColumn(columnId: string, dto: Partial<CreateColumnDto>) {
    return prisma.sprintColumn.update({ where: { id: columnId }, data: dto })
  }

  async deleteColumn(columnId: string) {
    await prisma.sprintColumn.update({ where: { id: columnId }, data: { deletedAt: new Date() } })
  }
}
