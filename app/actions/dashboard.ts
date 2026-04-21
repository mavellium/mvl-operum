'use server'

import { verifySession } from '@/lib/dal'
import { sprintsApi } from '@/lib/api-client'

export async function getDashboardDataAction() {
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
    const sprints = await sprintsApi.list() as Array<{ id: string; name: string }>
    const sprintMetrics = await Promise.all(
      sprints.map(s => sprintsApi.getMetrics(s.id).then(m => ({ ...m as object, name: s.name, id: s.id }))),
    )
    return sprintMetrics
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar sprints' }
  }
}

export async function getSprintDashboardAction(sprintId: string) {
  try {
    await verifySession()
    return await sprintsApi.getSprintDashboard(sprintId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard da sprint' }
  }
}
