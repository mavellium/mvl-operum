'use server'

import { verifySession } from '@/lib/dal'
import { sprintsApi } from '@/lib/api-client'

type GlobalMetrics = {
  kpis: { totalSprints: number; totalCards: number; horasTotais: number; custoTotal: number }
  userMetrics: { id: string; name: string; cargo?: string | null; avatarUrl?: string | null; horasTotais: number; custoTotal: number }[]
  memberMetrics: { id: string; name: string; cargo?: string | null; avatarUrl?: string | null; horasTotais: number; custoTotal: number; cardsTotal: number; cardsConcluidos: number; cardsAtrasados: number }[]
  overdueCards: { id: string; title: string; color: string; endDate: Date | string | null; sprint: { id: string; name: string } | null; sprintColumn: { title: string } | null; responsibles: { user: { id: string; name: string; avatarUrl: string | null } }[] }[]
  sprintMetrics: { id: string; name: string; cardsTotal: number; cardsConcluidos: number; horasTotais: number; custoTotal: number }[]
}

export async function getDashboardDataAction(): Promise<GlobalMetrics | { error: string }> {
  try {
    await verifySession()
    return await sprintsApi.getGlobalMetrics() as unknown as GlobalMetrics
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

type SprintDashboardData = {
  sprint: { id: string; name: string; status: string; startDate: Date | string | null; endDate: Date | string | null; qualidade: number | null; dificuldade: number | null }
  metrics: { horasTotais: number; custoTotal: number; cardsTotal: number; cardsConcluidos: number; cardsAtrasados: number }
  userMetrics?: { id: string; name: string; cargo: string | null; avatarUrl: string | null; horas: number; custo: number }[]
  cardsByColumn?: { name: string; count: number }[]
  overdueCards?: { id: string; title: string; color: string; endDate: Date | string | null; sprint: { id: string; name: string } | null; sprintColumn: { title: string } | null; responsibles: { user: { id: string; name: string; avatarUrl: string | null } }[] }[]
  feedbacks?: { id: string; userName: string; avatarUrl: string | null; qualidade: number; dificuldade: number; tarefasRealizadas: string | null; dificuldades: string | null }[]
  avgQualidade?: number | null
  avgDificuldade?: number | null
}

export async function getSprintDashboardAction(sprintId: string): Promise<SprintDashboardData | { error: string }> {
  try {
    await verifySession()
    return await sprintsApi.getSprintDashboard(sprintId) as unknown as SprintDashboardData
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard da sprint' }
  }
}
