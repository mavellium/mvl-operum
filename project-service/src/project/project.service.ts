import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertUserInTenant } from '../common/tenant-scope'
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  slogan: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  justificativa: z.string().optional(),
  objetivos: z.string().optional(),
  metodologia: z.string().optional(),
  descricaoProduto: z.string().optional(),
  premissas: z.string().optional(),
  restricoes: z.string().optional(),
  limitesAutoridade: z.string().optional(),
  semestre: z.string().optional(),
  ano: z.number().int().optional(),
  departamentos: z.array(z.string()).optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ tenantId: true }).extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
})

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>

@Injectable()
export class ProjectService {
  withoutDocuments<T extends object>(project: T) {
    const result = { ...project } as T & Record<string, unknown>
    for (const key of ['justificativa','objetivos','metodologia','descricaoProduto','premissas','restricoes','limitesAutoridade']) delete result[key]
    return result
  }

  async list(tenantId: string, page = 1, limit = 20, authorized?: string[]) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where: { tenantId, deletedAt: null, ...(authorized ? { id: { in: authorized } } : {}) },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: { where: { active: true } } },
          },
        },
      }),
      prisma.project.count({ where: { tenantId, deletedAt: null, ...(authorized ? { id: { in: authorized } } : {}) } }),
    ])
    return { items: items.map(p => this.withoutDocuments(p)), total, page, limit }
  }

  async findOne(id: string, tenantId: string) {
    const project = await prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        members: true,
        macroFases: true,
        stakeholders: { include: { stakeholder: true } },
      },
    })
    if (!project) throw new NotFoundException('Projeto não encontrado')
    return project
  }

  async create(dto: CreateProjectDto) {
    const existing = await prisma.project.findFirst({
      where: { name: dto.name, tenantId: dto.tenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Projeto com esse nome já existe')

    return prisma.project.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        departamentos: dto.departamentos ?? [],
      },
    })
  }

  async update(id: string, tenantId: string, dto: UpdateProjectDto) {
    await this.findOne(id, tenantId)
    return prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async getMembers(projectId: string, tenantId: string) {
    await this.findOne(projectId, tenantId)
    return prisma.userProject.findMany({
      where: { projectId, active: true },
      orderBy: { order: 'asc' },
    })
  }

  async reorderMembers(projectId: string, tenantId: string, orderedUserIds: string[]) {
    await this.findOne(projectId, tenantId)
    await Promise.all(
      orderedUserIds.map((userId, index) =>
        prisma.userProject.updateMany({
          where: { projectId, userId },
          data: { order: index },
        }),
      ),
    )
  }

  async addMember(projectId: string, tenantId: string, userId: string, data: { role?: string; departmentId?: string; hourlyRate?: number }) {
    await this.findOne(projectId, tenantId)
    await assertUserInTenant(userId, tenantId)
    return prisma.userProject.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId, ...data },
      update: { active: true, ...data },
    })
  }

  async removeMember(projectId: string, tenantId: string, userId: string) {
    await this.findOne(projectId, tenantId)
    await prisma.userProject.update({
      where: { userId_projectId: { userId, projectId } },
      data: { active: false },
    })
  }

  async getUserActiveProjects(userId: string, tenantId: string, authorized?: string[]) {
    return prisma.userProject.findMany({
      where: { userId, active: true, ...(authorized ? { projectId: { in: authorized } } : {}), project: { tenantId, deletedAt: null } },
      include: { project: { select: { id: true, name: true, status: true } } },
    })
  }

  async listMacroFases(projectId: string, tenantId: string) {
    await this.findOne(projectId, tenantId)
    return prisma.projectMacroFase.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } })
  }

  async upsertMacroFase(projectId: string, tenantId: string, fases: { fase: string; dataLimite?: string; custo?: string }[]) {
    await this.findOne(projectId, tenantId)
    await prisma.projectMacroFase.deleteMany({ where: { projectId } })
    return prisma.projectMacroFase.createMany({
      data: fases.map(f => ({ projectId, ...f })),
    })
  }
}
