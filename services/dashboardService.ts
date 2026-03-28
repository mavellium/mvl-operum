import prisma from '@/lib/prisma'

export async function getSprintMetrics(sprintId: string) {
  const [timeEntries, cards] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { card: { sprintId } },
      include: { user: { select: { valorHora: true } } },
    }),
    prisma.card.findMany({
      where: { sprintId },
      include: { column: { select: { title: true } } },
    }),
  ])

  const horasTotais = timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
  const custoTotal = timeEntries.reduce((sum, e) => sum + (e.duration / 3600) * e.user.valorHora, 0)
  const now = new Date()
  const cardsAtrasados = cards.filter(c => c.endDate && c.endDate < now && !c.column.title.toLowerCase().includes('conclu')).length
  const cardsConcluidos = cards.filter(c => c.column.title.toLowerCase().includes('conclu')).length

  return {
    horasTotais,
    custoTotal,
    cardsTotal: cards.length,
    cardsConcluidos,
    cardsAtrasados,
  }
}

export async function getUserMetrics(boardId: string) {
  const users = await prisma.user.findMany({
    where: { timeEntries: { some: { card: { column: { boardId } } } } },
    select: {
      id: true,
      name: true,
      cargo: true,
      avatarUrl: true,
      valorHora: true,
      timeEntries: {
        where: { card: { column: { boardId } } },
        select: { duration: true },
      },
    },
  })

  return users.map(u => {
    const horasTotais = u.timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)
    const custoTotal = horasTotais * u.valorHora
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

export async function getGlobalKPIs(boardId: string) {
  const [sprints, cards, timeEntries, users] = await Promise.all([
    prisma.sprint.findMany({ where: { boardId } }),
    prisma.card.findMany({ where: { column: { boardId } } }),
    prisma.timeEntry.findMany({
      where: { card: { column: { boardId } } },
      include: { user: { select: { valorHora: true } } },
    }),
    prisma.user.findMany({ select: { id: true, valorHora: true } }),
  ])

  const custoTotal = timeEntries.reduce((sum, e) => sum + (e.duration / 3600) * e.user.valorHora, 0)
  const horasTotais = timeEntries.reduce((sum, e) => sum + e.duration / 3600, 0)

  return {
    totalSprints: sprints.length,
    totalCards: cards.length,
    custoTotal,
    horasTotais,
    totalUsuarios: users.length,
  }
}
