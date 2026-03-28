'use server'

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { getGlobalKPIs, getUserMetrics, getSprintMetrics } from '@/services/dashboardService'

export async function getDashboardDataAction(boardId: string) {
  try {
    await verifySession()
    const [kpis, userMetrics, sprints] = await Promise.all([
      getGlobalKPIs(boardId),
      getUserMetrics(boardId),
      prisma.sprint.findMany({
        where: { boardId },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const sprintMetrics = await Promise.all(sprints.map(s => getSprintMetrics(s.id).then(m => ({ ...m, name: s.name, id: s.id }))))

    return { kpis, userMetrics, sprintMetrics }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard' }
  }
}
