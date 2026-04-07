import prisma from '@/lib/prisma'
import { CreateProjetoSchema, UpdateProjetoSchema } from '@/lib/validation/projetoSchemas'
import type { CreateProjetoInput, UpdateProjetoInput } from '@/lib/validation/projetoSchemas'

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

export async function createProjeto(input: CreateProjetoInput) {
  const parsed = CreateProjetoSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { nome, tenantId, descricao } = parsed.data

  const existing = await prisma.projeto.findFirst({
    where: { nome, tenantId, deletedAt: null },
  })
  if (existing) {
    throw new ConflictError('Projeto com este nome já existe neste tenant')
  }

  return prisma.projeto.create({
    data: { nome, tenantId, descricao: descricao ?? undefined },
  })
}

export async function findAllByTenant(tenantId: string) {
  return prisma.projeto.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findById(id: string) {
  return prisma.projeto.findUnique({
    where: { id, deletedAt: null },
    include: { _count: { select: { sprints: true } } },
  })
}

export async function updateProjeto(id: string, input: UpdateProjetoInput) {
  const parsed = UpdateProjetoSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const existing = await prisma.projeto.findUnique({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw new NotFoundError('Projeto não encontrado')
  }

  if (existing.status === 'CONCLUIDO' || existing.status === 'ARQUIVADO') {
    throw new Error('Não é possível alterar um projeto concluído ou arquivado')
  }

  return prisma.projeto.update({
    where: { id },
    data: parsed.data,
  })
}

export async function deleteProjeto(id: string) {
  return prisma.projeto.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function addMember(projetoId: string, userId: string) {
  const existing = await prisma.usuarioProjeto.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })
  if (existing) {
    if (existing.ativo) throw new ConflictError('Usuário já é membro ativo deste projeto')
    // Reactivate
    return prisma.usuarioProjeto.update({
      where: { id: existing.id },
      data: { ativo: true, dataSaida: null, dataEntrada: new Date() },
    })
  }

  return prisma.usuarioProjeto.create({
    data: { userId, projetoId },
  })
}

export async function removeMember(projetoId: string, userId: string) {
  const existing = await prisma.usuarioProjeto.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })
  if (!existing) {
    throw new NotFoundError('Membro não encontrado neste projeto')
  }

  return prisma.usuarioProjeto.update({
    where: { id: existing.id },
    data: { ativo: false, dataSaida: new Date() },
  })
}

export async function getMembrosComDetalhes(projetoId: string) {
  return prisma.usuarioProjeto.findMany({
    where: { projetoId, ativo: true },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
    orderBy: { dataEntrada: 'asc' },
  })
}

export async function updateUsuarioProjeto(
  userId: string,
  projetoId: string,
  data: { cargo?: string; departamento?: string; valorHora?: number | null; ativo?: boolean },
) {
  const existing = await prisma.usuarioProjeto.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })
  if (!existing) throw new NotFoundError('Membro não encontrado')

  return prisma.usuarioProjeto.update({
    where: { id: existing.id },
    data: {
      ...(data.cargo !== undefined ? { cargo: data.cargo || null } : {}),
      ...(data.departamento !== undefined ? { departamento: data.departamento || null } : {}),
      ...(data.valorHora !== undefined ? { valorHora: data.valorHora } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo, dataSaida: data.ativo ? null : new Date() } : {}),
    },
  })
}

export async function getUserProjetosComDetalhes(userId: string) {
  return prisma.usuarioProjeto.findMany({
    where: { userId },
    include: { projeto: { select: { id: true, nome: true, status: true } } },
    orderBy: { dataEntrada: 'asc' },
  })
}
