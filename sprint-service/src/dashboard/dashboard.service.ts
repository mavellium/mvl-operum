import { Injectable } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertSprint } from '../common/tenant-scope'

@Injectable()
export class DashboardService {
  async getMetrics(tenantId: string, sprintId: string) {
    await assertSprint(tenantId, sprintId)
    return prisma.dashboardMetric.findMany({
      where: { sprintId },
      orderBy: { rankingPosicao: 'asc' },
    })
  }

  async upsertMetric(tenantId: string, sprintId: string, userId: string, data: {
    horas?: number
    tarefasPendentes?: number
    custoTotal?: number
    rankingPosicao?: number
  }) {
    await assertSprint(tenantId, sprintId)
    return prisma.dashboardMetric.upsert({
      where: { sprintId_userId: { sprintId, userId } },
      create: { sprintId, userId, ...data },
      update: data,
    })
  }

  async getFeedbacks(tenantId: string, sprintId: string) {
    await assertSprint(tenantId, sprintId)
    return prisma.sprintFeedback.findMany({ where: { sprintId } })
  }

  async upsertFeedback(tenantId: string, sprintId: string, userId: string, data: {
    tarefasRealizadas?: string
    dificuldades?: string
    qualidade: number
    dificuldade: number
  }) {
    await assertSprint(tenantId, sprintId)
    return prisma.sprintFeedback.upsert({
      where: { sprintId_userId: { sprintId, userId } },
      create: { sprintId, userId, ...data },
      update: data,
    })
  }
}
