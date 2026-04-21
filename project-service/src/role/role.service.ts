import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { prisma } from '../prisma'
import { z } from 'zod'

export const CreateRoleSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  nameKey: z.string().min(1),
  scope: z.enum(['TENANT', 'PROJETO']),
  description: z.string().optional(),
})

export const UpdateRoleSchema = CreateRoleSchema.partial().omit({ tenantId: true })

export const CreatePermissionSchema = z.object({
  name: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  description: z.string().optional(),
})

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>
export type CreatePermissionDto = z.infer<typeof CreatePermissionSchema>

@Injectable()
export class RoleService {
  async listRoles(tenantId: string) {
    return prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async findRole(id: string, tenantId: string) {
    const role = await prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    })
    if (!role) throw new NotFoundException('Role não encontrada')
    return role
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await prisma.role.findFirst({
      where: { nameKey: dto.nameKey, tenantId: dto.tenantId, scope: dto.scope, deletedAt: null },
    })
    if (existing) throw new ConflictException('Role com esse nameKey já existe para este tenant/escopo')
    return prisma.role.create({ data: dto })
  }

  async updateRole(id: string, tenantId: string, dto: UpdateRoleDto) {
    await this.findRole(id, tenantId)
    return prisma.role.update({ where: { id }, data: dto })
  }

  async deleteRole(id: string, tenantId: string) {
    await this.findRole(id, tenantId)
    await prisma.role.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async assignPermission(roleId: string, tenantId: string, permissionId: string) {
    await this.findRole(roleId, tenantId)
    return prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    })
  }

  async removePermission(roleId: string, tenantId: string, permissionId: string) {
    await this.findRole(roleId, tenantId)
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    })
  }

  async listPermissions() {
    return prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    })
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await prisma.permission.findFirst({
      where: { resource: dto.resource, action: dto.action },
    })
    if (existing) throw new ConflictException('Permissão já existe')
    return prisma.permission.create({ data: dto })
  }

  async assignUserProjectRole(userId: string, projectId: string, roleId: string) {
    return prisma.userProjectRole.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId, roleId },
      update: { roleId },
    })
  }

  async removeUserProjectRole(userId: string, projectId: string) {
    await prisma.userProjectRole.update({
      where: { userId_projectId: { userId, projectId } },
      data: { deletedAt: new Date() },
    })
  }

  async getUserProjectRoles(projectId: string) {
    return prisma.userProjectRole.findMany({
      where: { projectId, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
  }
}
