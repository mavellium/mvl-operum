import { Injectable } from '@nestjs/common'
import { prisma } from '../prisma'

@Injectable()
export class AuditService {
  async log(tenantId: string, userId: string | undefined, action: string, entity: string, entityId?: string, details?: object) {
    return prisma.auditLog.create({
      data: { tenantId, userId, action, entity, entityId, details },
    })
  }

  async list(tenantId: string, entity?: string, entityId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit
    return prisma.auditLog.findMany({
      where: { tenantId, ...(entity ? { entity } : {}), ...(entityId ? { entityId } : {}) },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    })
  }
}
