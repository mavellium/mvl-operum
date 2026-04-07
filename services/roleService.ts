import prisma from '@/lib/prisma'
import { CreateRoleSchema, UpdateRoleSchema } from '@/lib/validation/roleSchemas'
import type { CreateRoleInput, UpdateRoleInput } from '@/lib/validation/roleSchemas'

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

  const { nome, tenantId, escopo, descricao } = parsed.data

  const existing = await prisma.role.findFirst({
    where: { nome, tenantId, escopo, deletedAt: null },
  })
  if (existing) {
    throw new ConflictError('Função com este nome já existe neste tenant')
  }

  return prisma.role.create({
    data: { nome, tenantId, escopo, descricao: descricao ?? undefined },
  })
}

interface FindAllByTenantOptions {
  scope?: string
}

export async function findAllByTenant(tenantId: string, options?: FindAllByTenantOptions) {
  const where: any = { tenantId, deletedAt: null }
  if (options?.scope) {
    where.escopo = options.scope
  }

  return prisma.role.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: { permissoes: { include: { permission: true } } },
  })
}

export async function findById(id: string) {
  return prisma.role.findUnique({
    where: { id, deletedAt: null },
    include: { permissoes: { include: { permission: true } } },
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
    throw new NotFoundError('Função não encontrada')
  }

  return prisma.role.update({
    where: { id },
    data: parsed.data,
  })
}

export async function deleteRole(id: string) {
  const existing = await prisma.role.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Função não encontrada')
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
    throw new ConflictError('Função já tem essa permissão')
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
    throw new NotFoundError('Permissão não encontrada nesta função')
  }

  return prisma.rolePermission.delete({
    where: { id: existing.id },
  })
}

export async function assignUserToProject(userId: string, projetoId: string, roleId: string) {
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })

  if (existing && !existing.deletedAt) {
    throw new ConflictError('Usuário já atribuído a este projeto')
  }

  if (existing && existing.deletedAt) {
    return prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { roleId, deletedAt: null },
    })
  }

  return prisma.userProjectRole.create({
    data: { userId, projetoId, roleId },
  })
}
