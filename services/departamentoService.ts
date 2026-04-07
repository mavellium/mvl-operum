import prisma from '@/lib/prisma'
import { CreateDepartamentoSchema, UpdateDepartamentoSchema } from '@/lib/validation/departamentoSchemas'
import type { CreateDepartamentoInput, UpdateDepartamentoInput } from '@/lib/validation/departamentoSchemas'

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

export async function createDepartamento(input: CreateDepartamentoInput) {
  const parsed = CreateDepartamentoSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { nome, tenantId, descricao, valorHora } = parsed.data

  const existing = await prisma.departamento.findFirst({
    where: { nome, tenantId, deletedAt: null },
  })
  if (existing) {
    throw new ConflictError('Departamento com este nome já existe neste tenant')
  }

  return prisma.departamento.create({
    data: { nome, tenantId, descricao: descricao ?? undefined, valorHora: valorHora ?? undefined },
  })
}

export async function findAllByTenant(tenantId: string) {
  return prisma.departamento.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { nome: 'asc' },
  })
}

export async function updateDepartamento(id: string, input: UpdateDepartamentoInput) {
  const parsed = UpdateDepartamentoSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.departamento.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Departamento não encontrado')
  }

  return prisma.departamento.update({
    where: { id },
    data: parsed.data,
  })
}

export async function deactivate(id: string) {
  const existing = await prisma.departamento.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Departamento não encontrado')
  }

  const users = await prisma.usuarioDepartamento.findMany({
    where: { departamentoId: id },
  })
  if (users.length > 0) {
    throw new Error('Não é possível desativar departamento com usuários associados')
  }

  return prisma.departamento.update({
    where: { id },
    data: { ativo: false },
  })
}

export async function associateUser(departamentoId: string, userId: string) {
  const existing = await prisma.usuarioDepartamento.findUnique({
    where: { userId_departamentoId: { userId, departamentoId } },
  })
  if (existing) {
    throw new ConflictError('Usuário já está associado a este departamento')
  }

  return prisma.usuarioDepartamento.create({
    data: { userId, departamentoId },
  })
}

export async function dissociateUser(departamentoId: string, userId: string) {
  const existing = await prisma.usuarioDepartamento.findUnique({
    where: { userId_departamentoId: { userId, departamentoId } },
  })
  if (!existing) {
    throw new NotFoundError('Associação não encontrada')
  }

  return prisma.usuarioDepartamento.delete({
    where: { id: existing.id },
  })
}
