import prisma from '@/lib/prisma'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function getSprintMetrics(sprintId: string) {
  const [timeEntries, cards] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { card: { sprintId, deletedAt: null }, deletedAt: null },
      include: { user: { select: { hourlyRate: true } } },
    }),
    prisma.card.findMany({
      where: { sprintId, deletedAt: null },
      include: { sprintColumn: { select: { title: true } } },
    }),
  ])

  const horasTotais = timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
  const custoTotal = timeEntries.reduce((sum, e) => sum + (e.duration / 3600) * e.user.hourlyRate, 0)
  const now = new Date()
  const isDone = (c: typeof cards[number]) => /conclu/i.test(c.sprintColumn?.title ?? '')
  const cardsConcluidos = cards.filter(isDone).length
  const cardsAtrasados = cards.filter(c => c.endDate && c.endDate < now && !isDone(c)).length

  return {
    horasTotais,
    custoTotal,
    cardsTotal: cards.length,
    cardsConcluidos,
    cardsAtrasados,
  }
}

export async function getUserMetrics() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, timeEntries: { some: { deletedAt: null } } },
    select: {
      id: true,
      name: true,
      cargo: true,
      avatarUrl: true,
      hourlyRate: true,
      timeEntries: {
        where: { deletedAt: null },
        select: { duration: true },
      },
    },
  })

  return users.map(u => {
    const horasTotais = u.timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
    const custoTotal = horasTotais * u.hourlyRate
    return {
      id: u.id,
      name: u.name,
      cargo: u.cargo,
      avatarUrl: u.avatarUrl,
      horasTotais,
      custoTotal,
    }
  })
}

export async function getMemberCardMetrics() {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      cargo: true,
      avatarUrl: true,
      hourlyRate: true,
      timeEntries: { where: { deletedAt: null }, select: { duration: true } },
      responsibleCards: {
        select: {
          card: {
            select: {
              id: true,
              endDate: true,
              deletedAt: true,
              sprintColumn: { select: { title: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return users.map(u => {
    const cards = u.responsibleCards.map(r => r.card).filter(c => c.deletedAt === null)
    const isDone = (c: typeof cards[number]) => /conclu/i.test(c.sprintColumn?.title ?? '')
    const horasTotais = u.timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
    return {
      id: u.id,
      name: u.name,
      cargo: u.cargo,
      avatarUrl: u.avatarUrl,
      horasTotais,
      custoTotal: horasTotais * u.hourlyRate,
      cardsTotal: cards.length,
      cardsConcluidos: cards.filter(isDone).length,
      cardsAtrasados: cards.filter(c => c.endDate && c.endDate < now && !isDone(c)).length,
    }
  })
}

export async function getOverdueCards() {
  const now = new Date()
  const cards = await prisma.card.findMany({
    where: { endDate: { lt: now }, deletedAt: null },
    include: {
      sprint: { select: { id: true, name: true } },
      sprintColumn: { select: { title: true } },
      responsibles: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
    orderBy: { endDate: 'asc' },
    take: 50,
  })

  const isDone = (title?: string | null) => /conclu/i.test(title ?? '')
  return cards.filter(c => !isDone(c.sprintColumn?.title))
}

export async function getGlobalKPIs() {
  const [sprints, cards, timeEntries, users] = await Promise.all([
    prisma.sprint.findMany({ where: { deletedAt: null } }),
    prisma.card.findMany({ where: { deletedAt: null } }),
    prisma.timeEntry.findMany({
      where: { deletedAt: null },
      include: { user: { select: { hourlyRate: true } } },
    }),
    prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, hourlyRate: true } }),
  ])

  const custoTotal = timeEntries.reduce((sum, e) => sum + (e.duration / 3600) * e.user.hourlyRate, 0)
  const horasTotais = timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)

  return {
    totalSprints: sprints.length,
    totalCards: cards.length,
    custoTotal,
    horasTotais,
    totalUsuarios: users.length,
  }
}

export async function getSprintsWithMetrics() {
  const sprints = await prisma.sprint.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } })
  const metricsArray = await Promise.all(sprints.map(s => getSprintMetrics(s.id)))
  return sprints.map((sprint, i) => ({ sprint, metrics: metricsArray[i] }))
}

export async function getSprintDashboard(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId, deletedAt: null } })
  if (!sprint) throw new NotFoundError(`Sprint não encontrado: ${sprintId}`)

  const metrics = await getSprintMetrics(sprintId)

  return { sprint, metrics }
}
