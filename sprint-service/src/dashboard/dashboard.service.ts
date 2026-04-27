import { Injectable } from '@nestjs/common'
import { prisma } from '../prisma'

@Injectable()
export class DashboardService {
  async getMetrics(sprintId: string) {
    return prisma.dashboardMetric.findMany({
      where: { sprintId },
      orderBy: { rankingPosicao: 'asc' },
    })
  }

  async upsertMetric(sprintId: string, userId: string, data: {
    horas?: number
    tarefasPendentes?: number
    custoTotal?: number
    rankingPosicao?: number
  }) {
    return prisma.dashboardMetric.upsert({
      where: { sprintId_userId: { sprintId, userId } },
      create: { sprintId, userId, ...data },
      update: data,
    })
  }

  async getFeedbacks(sprintId: string) {
    return prisma.sprintFeedback.findMany({ where: { sprintId } })
  }

  async upsertFeedback(sprintId: string, userId: string, data: {
    tarefasRealizadas?: string
    dificuldades?: string
    qualidade: number
    dificuldade: number
  }) {
    return prisma.sprintFeedback.upsert({
      where: { sprintId_userId: { sprintId, userId } },
      create: { sprintId, userId, ...data },
      update: data,
    })
  }
}
