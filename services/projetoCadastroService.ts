import prisma from '@/lib/prisma'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class InUseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InUseError'
  }
}

async function ensureProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new NotFoundError('Projeto não encontrado')
  return project
}

// ── Departamentos ──────────────────────────────────────────

export async function associarDepartamento(projectId: string, departmentId: string) {
  await ensureProject(projectId)
  const department = await prisma.department.findUnique({
    where: { id: departmentId, deletedAt: null },
  })
  if (!department) throw new NotFoundError('Departamento não encontrado')

  const existing = await prisma.projetoDepartamento.findUnique({
    where: { projetoId_departamentoId: { projetoId: projectId, departamentoId: departmentId } },
  })
  if (existing) return existing

  return prisma.projetoDepartamento.create({
    data: { projetoId: projectId, departamentoId: departmentId },
  })
}

export async function desassociarDepartamento(projectId: string, departmentId: string) {
  const existing = await prisma.projetoDepartamento.findUnique({
    where: { projetoId_departamentoId: { projetoId: projectId, departamentoId: departmentId } },
  })
  if (!existing) throw new NotFoundError('Associação não encontrada')
  return prisma.projetoDepartamento.delete({ where: { id: existing.id } })
}

export async function listarDepartamentosAssociados(projectId: string) {
  const rows = await prisma.projetoDepartamento.findMany({
    where: { projetoId: projectId },
    select: { departamentoId: true },
  })
  return rows.map(r => r.departamentoId)
}

// ── Funções ────────────────────────────────────────────────

export async function associarFuncao(projectId: string, funcaoId: string) {
  await ensureProject(projectId)
  const role = await prisma.role.findUnique({ where: { id: funcaoId, deletedAt: null } })
  if (!role) throw new NotFoundError('Função não encontrada')

  const existing = await prisma.projetoFuncao.findUnique({
    where: { projetoId_funcaoId: { projetoId: projectId, funcaoId } },
  })
  if (existing) return existing

  return prisma.projetoFuncao.create({
    data: { projetoId: projectId, funcaoId },
  })
}

export async function desassociarFuncao(projectId: string, funcaoId: string) {
  const existing = await prisma.projetoFuncao.findUnique({
    where: { projetoId_funcaoId: { projetoId: projectId, funcaoId } },
  })
  if (!existing) throw new NotFoundError('Associação não encontrada')
  return prisma.projetoFuncao.delete({ where: { id: existing.id } })
}

export async function listarFuncoesAssociadas(projectId: string) {
  const rows = await prisma.projetoFuncao.findMany({
    where: { projetoId: projectId },
    select: { funcaoId: true },
  })
  return rows.map(r => r.funcaoId)
}

// ── Uso pelo projeto (regra de bloqueio no catálogo global) ──

export async function contAssociacoesDepartamento(departmentId: string): Promise<number> {
  return prisma.projetoDepartamento.count({ where: { departamentoId: departmentId } })
}

export async function contAssociacoesFuncao(funcaoId: string): Promise<number> {
  return prisma.projetoFuncao.count({ where: { funcaoId } })
}
