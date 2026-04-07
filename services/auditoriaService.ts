import prisma from '@/lib/prisma'

export async function registrarAcao(params: {
  tenantId: string
  userId?: string
  acao: string
  entidade: string
  entidadeId?: string
  detalhes?: Record<string, unknown>
}) {
  return prisma.auditoria.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      detalhes: params.detalhes ? JSON.parse(JSON.stringify(params.detalhes)) : undefined,
    },
  })
}

export interface AuditoriaFilters {
  userId?: string
  acao?: string
  entidade?: string
  entidadeId?: string
  desde?: Date
  ate?: Date
  skip?: number
  take?: number
}

export async function listarAuditorias(tenantId: string, filters: AuditoriaFilters = {}) {
  const where: Record<string, unknown> = { tenantId }

  if (filters.userId) where.userId = filters.userId
  if (filters.acao) where.acao = { contains: filters.acao, mode: 'insensitive' }
  if (filters.entidade) where.entidade = filters.entidade
  if (filters.entidadeId) where.entidadeId = filters.entidadeId
  if (filters.desde || filters.ate) {
    where.timestamp = {
      ...(filters.desde ? { gte: filters.desde } : {}),
      ...(filters.ate ? { lte: filters.ate } : {}),
    }
  }

  return prisma.auditoria.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip: filters.skip ?? 0,
    take: filters.take ?? 50,
  })
}

export async function buscarAuditoria(entidade: string, entidadeId: string) {
  return prisma.auditoria.findMany({
    where: { entidade, entidadeId },
    orderBy: { timestamp: 'desc' },
  })
}

export async function contarAuditorias(tenantId: string, filters: AuditoriaFilters = {}) {
  const where: Record<string, unknown> = { tenantId }
  if (filters.userId) where.userId = filters.userId
  if (filters.acao) where.acao = { contains: filters.acao, mode: 'insensitive' }
  if (filters.entidade) where.entidade = filters.entidade
  if (filters.desde || filters.ate) {
    where.timestamp = {
      ...(filters.desde ? { gte: filters.desde } : {}),
      ...(filters.ate ? { lte: filters.ate } : {}),
    }
  }
  return prisma.auditoria.count({ where })
}
