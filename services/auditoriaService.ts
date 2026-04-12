import prisma from '@/lib/prisma'

export async function registrarAcao(params: {
  tenantId: string
  userId?: string
  action: string
  entity: string
  entityId?: string
  details?: Record<string, unknown>
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
    },
  })
}

export interface AuditoriaFilters {
  userId?: string
  action?: string
  entity?: string
  entityId?: string
  desde?: Date
  ate?: Date
  skip?: number
  take?: number
}

export async function listarAuditorias(tenantId: string, filters: AuditoriaFilters = {}) {
  const where: Record<string, unknown> = { tenantId }

  if (filters.userId) where.userId = filters.userId
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' }
  if (filters.entity) where.entity = filters.entity
  if (filters.entityId) where.entityId = filters.entityId
  if (filters.desde || filters.ate) {
    where.timestamp = {
      ...(filters.desde ? { gte: filters.desde } : {}),
      ...(filters.ate ? { lte: filters.ate } : {}),
    }
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip: filters.skip ?? 0,
    take: filters.take ?? 50,
  })
}

export async function buscarAuditoria(entity: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { timestamp: 'desc' },
  })
}

export async function contarAuditorias(tenantId: string, filters: AuditoriaFilters = {}) {
  const where: Record<string, unknown> = { tenantId }
  if (filters.userId) where.userId = filters.userId
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' }
  if (filters.entity) where.entity = filters.entity
  if (filters.desde || filters.ate) {
    where.timestamp = {
      ...(filters.desde ? { gte: filters.desde } : {}),
      ...(filters.ate ? { lte: filters.ate } : {}),
    }
  }
  return prisma.auditLog.count({ where })
}
