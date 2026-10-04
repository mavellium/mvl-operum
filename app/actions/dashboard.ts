'use server'

import { verifySession } from '@/lib/dal'
import { sprintsApi } from '@/lib/api-client'

import type { GlobalDashboardData, SprintDashboardData } from '@/sprint-service/src/dashboard/dashboard-contract'

export async function getDashboardDataAction(): Promise<GlobalDashboardData | { error: string }> {
  try {
    await verifySession()
    return await sprintsApi.getGlobalMetrics()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard' }
  }
}

export async function getSprintsWithMetricsAction() {
  try {
    await verifySession()
    return (await sprintsApi.getGlobalMetrics()).sprintMetrics
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar sprints' }
  }
}

export async function getSprintDashboardAction(sprintId: string): Promise<SprintDashboardData | { error: string }> {
  try {
    await verifySession()
    return await sprintsApi.getSprintDashboard(sprintId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard da sprint' }
  }
}
