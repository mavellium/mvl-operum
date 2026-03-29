import prisma from '@/lib/prisma'

export async function createSprintColumn(sprintId: string, title: string, position: number) {
  return prisma.sprintColumn.create({
    data: { sprintId, title, position },
  })
}

export async function getSprintColumns(sprintId: string) {
  return prisma.sprintColumn.findMany({
    where: { sprintId },
    orderBy: { position: 'asc' },
    include: {
      cards: {
        orderBy: { sprintPosition: 'asc' },
        include: {
          tags: { include: { tag: true } },
          responsibles: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          attachments: { select: { id: true, fileName: true, fileType: true, filePath: true, fileSize: true, isCover: true, uploadedAt: true } },
          timeEntries: { select: { duration: true } },
        },
      },
    },
  })
}

export async function initSprintColumns(sprintId: string) {
  return prisma.sprintColumn.createMany({
    data: [
      { sprintId, title: 'A Fazer', position: 0 },
      { sprintId, title: 'Em Andamento', position: 1 },
      { sprintId, title: 'Concluído', position: 2 },
    ],
  })
}

export async function moveCardInSprint(cardId: string, sprintColumnId: string, sprintPosition: number) {
  return prisma.card.update({
    where: { id: cardId },
    data: { sprintColumnId, sprintPosition },
  })
}

export async function renameSprintColumn(columnId: string, title: string) {
  return prisma.sprintColumn.update({ where: { id: columnId }, data: { title } })
}

export async function deleteSprintColumn(columnId: string) {
  return prisma.sprintColumn.delete({ where: { id: columnId } })
}

export async function reorderSprintColumns(columnIds: string[]) {
  return prisma.$transaction(
    columnIds.map((id, position) =>
      prisma.sprintColumn.update({ where: { id }, data: { position } })
    )
  )
}
