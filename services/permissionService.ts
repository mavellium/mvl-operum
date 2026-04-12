import prisma from '@/lib/prisma'

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

interface CreatePermissionInput {
  name: string
  resource: string
  action: string
  description?: string
}

export async function create(input: CreatePermissionInput) {
  const { name, resource, action, description } = input

  const byName = await prisma.permission.findUnique({
    where: { name },
  })
  if (byName) {
    throw new ConflictError('Permission with this name already exists')
  }

  const byResourceAction = await prisma.permission.findUnique({
    where: { resource_action: { resource, action } },
  })
  if (byResourceAction) {
    throw new ConflictError('Permission for this resource and action already exists')
  }

  return prisma.permission.create({
    data: {
      name,
      resource,
      action,
      description: description ?? undefined,
    },
  })
}

interface FindAllOptions {
  resource?: string
}

export async function findAll(options?: FindAllOptions) {
  const where: any = { deletedAt: null }
  if (options?.resource) {
    where.resource = options.resource
  }

  return prisma.permission.findMany({
    where,
    orderBy: { resource: 'asc' },
  })
}

export async function findById(id: string) {
  return prisma.permission.findUnique({
    where: { id, deletedAt: null },
  })
}

export async function findByRole(roleId: string) {
  return prisma.permission.findMany({
    where: {
      deletedAt: null,
      roles: {
        some: { roleId },
      },
    },
    orderBy: { resource: 'asc' },
  })
}

export async function deletePermission(id: string) {
  const existing = await prisma.permission.findUnique({
    where: { id },
  })
  if (!existing) {
    throw new NotFoundError('Permission not found')
  }

  return prisma.permission.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
