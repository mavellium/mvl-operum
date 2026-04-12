import prisma from '@/lib/prisma'
import { CreateDepartmentSchema, UpdateDepartmentSchema } from '@/lib/validation/departmentSchemas'
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/lib/validation/departmentSchemas'
import { normalizeNome } from '@/lib/utils/normalize'

const activeOnly = { deletedAt: null } as const

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

export async function createDepartment(input: CreateDepartmentInput) {
  const parsed = CreateDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { name, tenantId, description, hourlyRate } = parsed.data

  const existing = await prisma.department.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, tenantId, ...activeOnly },
  })
  if (existing) {
    throw new ConflictError('Department with this name already exists in this tenant')
  }

  return prisma.department.create({
    data: { name, tenantId, description: description ?? undefined, hourlyRate: hourlyRate ?? undefined },
  })
}

export async function findAllByTenant(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId, ...activeOnly },
    orderBy: { name: 'asc' },
  })
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  const parsed = UpdateDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.department.findUnique({
    where: { id, ...activeOnly },
  })
  if (!existing) {
    throw new NotFoundError('Department not found')
  }

  return prisma.department.update({
    where: { id },
    data: parsed.data,
  })
}

export async function deactivate(id: string) {
  const existing = await prisma.department.findUnique({
    where: { id, ...activeOnly },
  })
  if (!existing) {
    throw new NotFoundError('Department not found')
  }

  const users = await prisma.userDepartment.findMany({
    where: { departmentId: id },
  })
  if (users.length > 0) {
    throw new Error('Cannot deactivate department with associated users')
  }

  return prisma.department.update({
    where: { id },
    data: { active: false },
  })
}

export async function getOrCreateDepartment(name: string, tenantId: string) {
  const { nome: nameTrimmed } = normalizeNome(name)
  const existing = await prisma.department.findFirst({
    where: { name: { equals: nameTrimmed, mode: 'insensitive' }, tenantId, ...activeOnly },
  })
  if (existing) return existing
  return prisma.department.create({
    data: { name: nameTrimmed, tenantId },
  })
}

export async function softDeleteDepartment(id: string) {
  try {
    await prisma.userDepartment.deleteMany({ where: { departmentId: id } })

    await prisma.userProject.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    })

    const result = await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return result
  } catch (err) {
    console.error('ERROR DELETING DEPARTMENT:', err)
    throw err
  }
}

export async function associateUser(departmentId: string, userId: string) {
  const existing = await prisma.userDepartment.findUnique({
    where: { userId_departmentId: { userId, departmentId } },
  })
  if (existing) {
    throw new ConflictError('User is already associated with this department')
  }

  return prisma.userDepartment.create({
    data: { userId, departmentId },
  })
}

export async function dissociateUser(departmentId: string, userId: string) {
  const existing = await prisma.userDepartment.findUnique({
    where: { userId_departmentId: { userId, departmentId } },
  })
  if (!existing) {
    throw new NotFoundError('Association not found')
  }

  return prisma.userDepartment.delete({
    where: { id: existing.id },
  })
}
