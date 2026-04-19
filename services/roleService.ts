import prisma from '@/lib/prisma'
import { CreateRoleSchema, UpdateRoleSchema } from '@/lib/validation/roleSchemas'
import type { CreateRoleInput, UpdateRoleInput } from '@/lib/validation/roleSchemas'
import { normalizeNome } from '@/lib/utils/normalize'

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function createRole(input: CreateRoleInput) {
  const parsed = CreateRoleSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { name: rawName, tenantId, scope, description } = parsed.data
  const { nome: name, nomeKey: nameKey } = normalizeNome(rawName)

  const existing = await prisma.role.findFirst({
    where: { nameKey, tenantId, scope, deletedAt: null },
  })
  if (existing) {
    throw new ConflictError('Role with this name already exists in this tenant')
  }

  return prisma.role.create({
    data: { name, nameKey, tenantId, scope, description: description ?? undefined },
  })
}

interface FindAllByTenantOptions {
  scope?: string
}

export async function findAllByTenant(tenantId: string, options?: FindAllByTenantOptions) {
  const where: { tenantId: string; deletedAt: null; scope?: string } = { tenantId, deletedAt: null }
  if (options?.scope) {
    where.scope = options.scope
  }

  return prisma.role.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { permissions: { include: { permission: true } } },
  })
}

export async function findById(id: string) {
  return prisma.role.findUnique({
    where: { id, deletedAt: null },
    include: { permissions: { include: { permission: true } } },
  })
}

export async function updateRole(id: string, input: UpdateRoleInput) {
  const parsed = UpdateRoleSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.role.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Role not found')
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.name) {
    const { nome: name, nomeKey: nameKey } = normalizeNome(parsed.data.name)
    data.name = name
    data.nameKey = nameKey
  }

  return prisma.role.update({
    where: { id },
    data,
  })
}

export async function deleteRole(id: string) {
  const existing = await prisma.role.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Role not found')
  }

  return prisma.role.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function assignPermission(roleId: string, permissionId: string) {
  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  })
  if (existing) {
    throw new ConflictError('Role already has this permission')
  }

  return prisma.rolePermission.create({
    data: { roleId, permissionId },
  })
}

export async function removePermission(roleId: string, permissionId: string) {
  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  })
  if (!existing) {
    throw new NotFoundError('Permission not found on this role')
  }

  return prisma.rolePermission.delete({
    where: { id: existing.id },
  })
}

export async function getOrCreateRole(name: string, tenantId: string) {
  const { nome: nameTrimmed, nomeKey: nameKey } = normalizeNome(name)
  const existing = await prisma.role.findFirst({
    where: { nameKey, tenantId, scope: 'PROJETO', deletedAt: null },
  })
  if (existing) return existing
  return prisma.role.create({
    data: { name: nameTrimmed, nameKey, tenantId, scope: 'PROJETO' },
  })
}

export async function softDeleteRole(id: string) {
  await prisma.userProjectRole.updateMany({
    where: { roleId: id, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  return prisma.role.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function assignUserToProject(userId: string, projectId: string, roleId: string) {
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })

  if (existing && !existing.deletedAt) {
    throw new ConflictError('User already assigned to this project')
  }

  if (existing && existing.deletedAt) {
    return prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { roleId, deletedAt: null },
    })
  }

  return prisma.userProjectRole.create({
    data: { userId, projectId, roleId },
  })
}
