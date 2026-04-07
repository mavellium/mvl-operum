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
  nome: string
  recurso: string
  acao: string
  descricao?: string
}

export async function create(input: CreatePermissionInput) {
  const { nome, recurso, acao, descricao } = input

  const byNome = await prisma.permission.findUnique({
    where: { nome },
  })
  if (byNome) {
    throw new ConflictError('Permissão com este nome já existe')
  }

  const byResourceAction = await prisma.permission.findUnique({
    where: { recurso_acao: { recurso, acao } },
  })
  if (byResourceAction) {
    throw new ConflictError('Permissão para este recurso e ação já existe')
  }

  return prisma.permission.create({
    data: {
      nome,
      recurso,
      acao,
      descricao: descricao ?? undefined,
    },
  })
}

interface FindAllOptions {
  recurso?: string
}

export async function findAll(options?: FindAllOptions) {
  const where: any = { deletedAt: null }
  if (options?.recurso) {
    where.recurso = options.recurso
  }

  return prisma.permission.findMany({
    where,
    orderBy: { recurso: 'asc' },
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
    orderBy: { recurso: 'asc' },
  })
}

export async function deletePermission(id: string) {
  const existing = await prisma.permission.findUnique({
    where: { id },
  })
  if (!existing) {
    throw new NotFoundError('Permissão não encontrada')
  }

  return prisma.permission.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
