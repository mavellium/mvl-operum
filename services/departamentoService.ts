import prisma from "@/lib/prisma"
import { normalizeNome } from "@/lib/utils/normalize"
import { CreateDepartmentInput, CreateDepartmentSchema, UpdateDepartmentInput, UpdateDepartmentSchema } from "@/lib/validation/departmentSchemas"

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

export async function createdepartment(input: CreateDepartmentInput) {
  const parsed = CreateDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { name, tenantId, description, hourlyRate } = parsed.data

  const existing = await prisma.department.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, tenantId, ...activeOnly },
  })
  if (existing) {
    throw new ConflictError('department com este nome já existe neste tenant')
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

export async function updatedepartment(id: string, input: UpdateDepartmentInput) {
  const parsed = UpdateDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.department.findUnique({
    where: { id, ...activeOnly },
  })
  if (!existing) {
    throw new NotFoundError('department não encontrado')
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
    throw new NotFoundError('department não encontrado')
  }

  const users = await prisma.userDepartment.findMany({
    where: { departmentId: id },
  })
  if (users.length > 0) {
    throw new Error('Não é possível desativar department com usuários associados')
  }

  return prisma.department.update({
    where: { id },
    data: { active: false },
  })
}

export async function getOrCreatedepartment(nome: string, tenantId: string) {
  const { nome: nomeTrimmed } = normalizeNome(nome)
  const existing = await prisma.department.findFirst({
    where: { name: { equals: nomeTrimmed, mode: 'insensitive' }, tenantId, ...activeOnly },
  })
  if (existing) return existing
  return prisma.department.create({
    data: { name: nomeTrimmed, tenantId },
  })
}

export async function softDeletedepartment(id: string) {
  try {
    await prisma.userDepartment.deleteMany({
      where: { departmentId: id }
    })

    const result = await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    console.log('department deletado:', result.id)

    return result
  } catch (err) {
    console.error('ERRO AO DELETAR department:', err)
    throw err
  }
}

export async function associateUser(departmentId: string, userId: string) {
  const existing = await prisma.userDepartment.findUnique({
    where: { userId_departmentId: { userId, departmentId } },
  })
  if (existing) {
    throw new ConflictError('Usuário já está associado a este department')
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
    throw new NotFoundError('Associação não encontrada')
  }

  return prisma.userDepartment.delete({
    where: { id: existing.id },
  })
}
