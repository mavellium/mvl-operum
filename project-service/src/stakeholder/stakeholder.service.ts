import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateStakeholderSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  logoUrl: z.string().optional(),
  company: z.string().optional(),
  competence: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateStakeholderSchema = CreateStakeholderSchema.partial().omit({ tenantId: true })

export type CreateStakeholderDto = z.infer<typeof CreateStakeholderSchema>
export type UpdateStakeholderDto = z.infer<typeof UpdateStakeholderSchema>

@Injectable()
export class StakeholderService {
  async list(tenantId: string) {
    return prisma.stakeholder.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const s = await prisma.stakeholder.findFirst({
      where: { id, tenantId },
      include: { projects: { include: { project: true } } },
    })
    if (!s) throw new NotFoundException('Stakeholder não encontrado')
    return s
  }

  async create(dto: CreateStakeholderDto) {
    return prisma.stakeholder.create({ data: dto })
  }

  async update(id: string, tenantId: string, dto: UpdateStakeholderDto) {
    await this.findOne(id, tenantId)
    return prisma.stakeholder.update({ where: { id }, data: dto })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    await prisma.stakeholder.update({ where: { id }, data: { isActive: false } })
  }

  async linkProject(stakeholderId: string, projectId: string, tenantId: string) {
    await this.findOne(stakeholderId, tenantId)
    return prisma.projectStakeholder.upsert({
      where: { projectId_stakeholderId: { projectId, stakeholderId } },
      create: { projectId, stakeholderId },
      update: {},
    })
  }

  async unlinkProject(stakeholderId: string, projectId: string, tenantId: string) {
    await this.findOne(stakeholderId, tenantId)
    await prisma.projectStakeholder.delete({
      where: { projectId_stakeholderId: { projectId, stakeholderId } },
    })
  }

  async listByProject(projectId: string) {
    return prisma.projectStakeholder.findMany({
      where: { projectId },
      include: { stakeholder: true },
    })
  }
}
