'use server'

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { getGlobalKPIs, getUserMetrics, getSprintMetrics, getSprintDashboard, getSprintsWithMetrics, getMemberCardMetrics, getOverdueCards } from '@/services/dashboardService'

export async function getDashboardDataAction() {
  try {
    await verifySession()
    const [kpis, userMetrics, memberMetrics, overdueCards, sprints] = await Promise.all([
      getGlobalKPIs(),
      getUserMetrics(),
      getMemberCardMetrics(),
      getOverdueCards(),
      prisma.sprint.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

    const sprintMetrics = await Promise.all(sprints.map(s => getSprintMetrics(s.id).then(m => ({ ...m, name: s.name, id: s.id }))))

    return { kpis, userMetrics, memberMetrics, overdueCards, sprintMetrics }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard' }
  }
}

export async function getSprintsWithMetricsAction() {
  try {
    await verifySession()
    return await getSprintsWithMetrics()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar sprints' }
  }
}

export async function getSprintDashboardAction(sprintId: string) {
  try {
    await verifySession()
    const { sprint, metrics } = await getSprintDashboard(sprintId)

    // user metrics for this sprint
    const timeEntries = await prisma.timeEntry.findMany({
      where: { card: { sprintId, deletedAt: null }, deletedAt: null },
      select: { userId: true, duration: true, user: { select: { id: true, name: true, cargo: true, avatarUrl: true, valorHora: true } } },
    })

    const userMap = new Map<string, { id: string; name: string; cargo: string | null; avatarUrl: string | null; horas: number; custo: number }>()
    for (const entry of timeEntries) {
      const existing = userMap.get(entry.userId)
      const h = entry.duration / 3600
      if (existing) {
        existing.horas += h
        existing.custo += h * entry.user.valorHora
      } else {
        userMap.set(entry.userId, {
          id: entry.user.id,
          name: entry.user.name,
          cargo: entry.user.cargo,
          avatarUrl: entry.user.avatarUrl,
          horas: h,
          custo: h * entry.user.valorHora,
        })
      }
    }
    const userMetrics = Array.from(userMap.values()).sort((a, b) => b.horas - a.horas)

    // cards by column (for chart)
    const columns = await prisma.sprintColumn.findMany({
      where: { sprintId },
      include: { cards: { where: { deletedAt: null }, select: { id: true } } },
      orderBy: { position: 'asc' },
    })
    const cardsByColumn = columns.map(c => ({ name: c.title, count: c.cards.length }))

    // overdue cards
    const now = new Date()
    const overdueCards = await prisma.card.findMany({
      where: { sprintId, endDate: { lt: now }, deletedAt: null },
      include: {
        sprint: { select: { id: true, name: true } },
        sprintColumn: { select: { title: true } },
        responsibles: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    })
    const overdueFiltered = overdueCards.filter(c => !/conclu/i.test(c.sprintColumn?.title ?? ''))

    // sprint feedbacks
    const feedbacks = await prisma.sprintFeedback.findMany({
      where: { sprintId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const feedbackData = feedbacks.map(f => ({
      id: f.id,
      userName: f.user.name,
      avatarUrl: f.user.avatarUrl,
      qualidade: f.qualidade,
      dificuldade: f.dificuldade,
      tarefasRealizadas: f.tarefasRealizadas,
      dificuldades: f.dificuldades,
    }))
    const avgQualidade = feedbacks.length > 0 ? feedbacks.reduce((s, f) => s + f.qualidade, 0) / feedbacks.length : null
    const avgDificuldade = feedbacks.length > 0 ? feedbacks.reduce((s, f) => s + f.dificuldade, 0) / feedbacks.length : null

    return {
      sprint,
      metrics,
      userMetrics,
      cardsByColumn,
      overdueCards: overdueFiltered,
      feedbacks: feedbackData,
      avgQualidade,
      avgDificuldade,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar dashboard da sprint' }
  }
}
