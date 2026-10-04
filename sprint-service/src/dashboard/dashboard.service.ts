import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'
import { GlobalDashboardSchema, SprintDashboardSchema } from './dashboard-contract'
import { assertSprint } from '../common/tenant-scope'

@Injectable()
export class DashboardService {
  private async snapshot(tenantId: string, authorized: string[], sprintId?: string) {
    return prisma.$transaction(async tx => {
      const projectScope = { tenantId, deletedAt: null, ...(sprintId ? {} : { id: { in: authorized } }) }
      const sprints = await tx.sprint.findMany({ where: { deletedAt: null, project: projectScope, ...(sprintId ? { id: sprintId } : {}) }, include: { sprintColumns: { where: { deletedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
      if (sprintId && sprints.length === 0) throw new NotFoundException('Sprint não encontrada')
      const cards = (await tx.card.findMany({ where: { deletedAt: null, ...(sprintId ? { sprintId } : { OR: [{ sprintId: null, project: projectScope }, { sprint: { deletedAt: null, project: projectScope } }] }) }, include: {
        sprint: { select: { id: true, name: true, projectId: true } },
        sprintColumn: { select: { id: true, sprintId: true, title: true, deletedAt: true } },
        responsibles: { where: { user: { tenantId, deletedAt: null } }, include: { user: true } },
      } })).filter(card => (!card.sprint || !card.projectId || card.projectId === card.sprint.projectId) && (!card.sprintColumn || card.sprintColumn.sprintId === card.sprintId))
      const entries = await tx.timeEntry.findMany({ where: { cardId: { in: cards.map(card => card.id) }, deletedAt: null, user: { tenantId, deletedAt: null } }, include: { user: true } })
      const members = await tx.userProject.findMany({ where: { active: true, project: sprintId ? { ...projectScope, id: sprints[0].projectId! } : projectScope, user: { tenantId, deletedAt: null } }, include: { user: true } })
      const feedbacks = sprintId ? await tx.sprintFeedback.findMany({ where: { sprintId, user: { tenantId, deletedAt: null } }, include: { user: true }, orderBy: { id: 'asc' } }) : []
      return { sprints, cards, entries, members, feedbacks }
    }, { isolationLevel: 'RepeatableRead' })
  }

  private aggregate(data: Awaited<ReturnType<DashboardService['snapshot']>>) {
    const { cards, entries } = data
    const now = Date.now()
    const done = (card: typeof cards[number]) => !card.sprintColumn?.deletedAt && /conclu/i.test(card.sprintColumn?.title ?? '')
    const overdue = (card: typeof cards[number]) => !!card.endDate && card.endDate.getTime() < now && !done(card)
    const cost = (entry: typeof entries[number]) => Math.max(0, entry.duration) / 3600 * Math.max(0, entry.user.hourlyRate)
    const totals = (selectedCards: typeof cards, selectedEntries: typeof entries) => ({
      horasTotais: selectedEntries.reduce((sum, entry) => sum + Math.max(0, entry.duration) / 3600, 0),
      custoTotal: selectedEntries.reduce((sum, entry) => sum + cost(entry), 0),
      cardsTotal: selectedCards.length, cardsConcluidos: selectedCards.filter(done).length, cardsAtrasados: selectedCards.filter(overdue).length,
    })
    const people = new Map(data.members.map(member => [member.user.id, member.user]))
    for (const entry of entries) people.set(entry.user.id, entry.user)
    for (const card of cards) for (const responsible of card.responsibles) people.set(responsible.user.id, responsible.user)
    const memberMetrics = [...people.values()].map(user => ({
      id: user.id, name: user.name, cargo: user.cargo, avatarUrl: user.avatarUrl,
      ...totals(cards.filter(card => card.responsibles.some(responsible => responsible.userId === user.id)), entries.filter(entry => entry.userId === user.id)),
    })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    const usersWithTime = new Set(entries.map(entry => entry.userId))
    const userMetrics = memberMetrics.filter(user => usersWithTime.has(user.id)).sort((a, b) => b.horasTotais - a.horasTotais || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    const overdueCards = cards.filter(overdue).sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime() || a.id.localeCompare(b.id)).slice(0, 50).map(card => ({
      id: card.id, title: card.title, color: card.color, endDate: card.endDate!.toISOString(),
      sprint: card.sprint ? { id: card.sprint.id, name: card.sprint.name } : null,
      sprintColumn: card.sprintColumn && !card.sprintColumn.deletedAt ? { title: card.sprintColumn.title } : null,
      responsibles: card.responsibles.map(responsible => ({ user: { id: responsible.user.id, name: responsible.user.name, avatarUrl: responsible.user.avatarUrl } })),
    }))
    return { metrics: totals(cards, entries), memberMetrics, userMetrics, overdueCards, totals }
  }

  async getGlobalDashboard(tenantId: string, authorized: string[]) {
    const data = await this.snapshot(tenantId, authorized)
    const aggregate = this.aggregate(data)
    return GlobalDashboardSchema.parse({
      kpis: { totalSprints: data.sprints.length, totalCards: data.cards.length, horasTotais: aggregate.metrics.horasTotais, custoTotal: aggregate.metrics.custoTotal },
      userMetrics: aggregate.userMetrics, memberMetrics: aggregate.memberMetrics, overdueCards: aggregate.overdueCards,
      sprintMetrics: data.sprints.map(sprint => {
        const cards = data.cards.filter(card => card.sprintId === sprint.id)
        const ids = new Set(cards.map(card => card.id))
        return { id: sprint.id, name: sprint.name, ...aggregate.totals(cards, data.entries.filter(entry => ids.has(entry.cardId))) }
      }),
    })
  }

  async getSprintDashboard(tenantId: string, sprintId: string) {
    const data = await this.snapshot(tenantId, [], sprintId)
    const aggregate = this.aggregate(data)
    const sprint = data.sprints[0]
    const average = (field: 'qualidade' | 'dificuldade') => data.feedbacks.length ? data.feedbacks.reduce((sum, feedback) => sum + feedback[field], 0) / data.feedbacks.length : null
    return SprintDashboardSchema.parse({
      sprint: { id: sprint.id, projectId: sprint.projectId, name: sprint.name, status: sprint.status, startDate: sprint.startDate?.toISOString() ?? null, endDate: sprint.endDate?.toISOString() ?? null, qualidade: sprint.qualidade, dificuldade: sprint.dificuldade },
      metrics: aggregate.metrics, userMetrics: aggregate.userMetrics.map(user => ({ ...user, horas: user.horasTotais, custo: user.custoTotal })),
      cardsByColumn: sprint.sprintColumns.map(column => ({ name: column.title, count: data.cards.filter(card => card.sprintColumnId === column.id).length })),
      overdueCards: aggregate.overdueCards,
      feedbacks: data.feedbacks.map(feedback => ({ id: feedback.id, userName: feedback.user.name, avatarUrl: feedback.user.avatarUrl, qualidade: feedback.qualidade, dificuldade: feedback.dificuldade, tarefasRealizadas: feedback.tarefasRealizadas, dificuldades: feedback.dificuldades })),
      avgQualidade: average('qualidade'), avgDificuldade: average('dificuldade'),
    })
  }

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
