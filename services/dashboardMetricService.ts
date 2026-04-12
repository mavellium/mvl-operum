import prisma from '@/lib/prisma'

export async function calcularParaSprintUsuario(sprintId: string, userId: string) {
  const [timeEntries, user, cards] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId, card: { sprintId, deletedAt: null }, deletedAt: null },
      select: { duration: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { hourlyRate: true } }),
    prisma.card.findMany({
      where: { sprintId, deletedAt: null, responsibles: { some: { userId } } },
      select: { sprintColumn: { select: { title: true } } },
    }),
  ])

  if (!user) throw new Error('Usuário não encontrado')

  const horas = timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
  const custoTotal = horas * user.hourlyRate
  const isDone = (title?: string | null) => /conclu/i.test(title ?? '')
  const tarefasPendentes = cards.filter(c => !isDone(c.sprintColumn?.title)).length

  return prisma.dashboardMetric.upsert({
    where: { sprintId_userId: { sprintId, userId } },
    create: { sprintId, userId, horas, tarefasPendentes, custoTotal },
    update: { horas, tarefasPendentes, custoTotal },
  })
}

export async function recalcularRankingDaSprint(sprintId: string) {
  const metrics = await prisma.dashboardMetric.findMany({
    where: { sprintId },
    orderBy: { horas: 'desc' },
  })

  await Promise.all(
    metrics.map((m, i) =>
      prisma.dashboardMetric.update({
        where: { id: m.id },
        data: { rankingPosicao: i + 1 },
      }),
    ),
  )
}

export async function recalcularParaSprint(sprintId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { card: { sprintId, deletedAt: null }, deletedAt: null },
    select: { userId: true },
    distinct: ['userId'],
  })

  const userIds = entries.map(e => e.userId)
  await Promise.all(userIds.map(uid => calcularParaSprintUsuario(sprintId, uid)))
  await recalcularRankingDaSprint(sprintId)
}

export async function listarMetricasPorSprint(sprintId: string) {
  return prisma.dashboardMetric.findMany({
    where: { sprintId },
    include: {
      user: { select: { id: true, name: true, cargo: true, avatarUrl: true } },
    },
    orderBy: { rankingPosicao: 'asc' },
  })
}

export async function listarMetricasPorUsuario(userId: string) {
  return prisma.dashboardMetric.findMany({
    where: { userId },
    include: { sprint: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
