import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateDepartmentSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  hourlyRate: z.number().optional(),
})

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial().omit({ tenantId: true })

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>

@Injectable()
export class DepartmentService {
  async list(tenantId: string) {
    return prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const dept = await prisma.department.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { users: true },
    })
    if (!dept) throw new NotFoundException('Departamento não encontrado')
    return dept
  }

  async create(dto: CreateDepartmentDto) {
    const existing = await prisma.department.findFirst({
      where: { name: dto.name, tenantId: dto.tenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Departamento com esse nome já existe')
    return prisma.department.create({ data: dto })
  }

  async update(id: string, tenantId: string, dto: UpdateDepartmentDto) {
    await this.findOne(id, tenantId)
    return prisma.department.update({ where: { id }, data: dto })
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addUser(departmentId: string, tenantId: string, userId: string) {
    await this.findOne(departmentId, tenantId)
    return prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId, departmentId } },
      create: { userId, departmentId },
      update: {},
    })
  }

  async removeUser(departmentId: string, tenantId: string, userId: string) {
    await this.findOne(departmentId, tenantId)
    await prisma.userDepartment.delete({
      where: { userId_departmentId: { userId, departmentId } },
    })
  }
}
