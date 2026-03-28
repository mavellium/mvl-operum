'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { BoardState, CardColor } from '@/types/kanban'

// Fetch (or seed) the single board and return it as BoardState
export async function getOrCreateBoard(): Promise<{ boardState: BoardState; boardId: string }> {
  let board = await prisma.board.findFirst({
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: { cards: { orderBy: { position: 'asc' } } },
      },
    },
  })

  if (!board) {
    board = await prisma.board.create({
      data: {
        name: 'Meu Projeto',
        columns: {
          create: [
            {
              id: 'col-seed-1',
              title: 'A Fazer',
              position: 0,
              cards: {
                create: [
                  { id: 'card-seed-1', title: 'Criar layout da página', description: 'Desenvolver o layout responsivo da página inicial.', responsible: 'Ana Silva', color: '#3b82f6', position: 0 },
                  { id: 'card-seed-2', title: 'Configurar banco de dados', description: 'Definir schema e configurar conexão.', responsible: 'Carlos Souza', color: '#8b5cf6', position: 1 },
                ],
              },
            },
            {
              id: 'col-seed-2',
              title: 'Em Andamento',
              position: 1,
              cards: {
                create: [
                  { id: 'card-seed-3', title: 'Autenticação de usuários', description: 'Implementar login e controle de sessão.', responsible: 'Maria Lima', color: '#f97316', position: 0 },
                ],
              },
            },
            { id: 'col-seed-3', title: 'Concluído', position: 2 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: { cards: { orderBy: { position: 'asc' } } },
        },
      },
    })
  }

  const cards: BoardState['cards'] = {}
  const columns: BoardState['columns'] = board.columns.map((col: typeof board.columns[number]) => {
    const cardIds: string[] = col.cards.map((card: typeof col.cards[number]) => {
      cards[card.id] = {
        id: card.id,
        title: card.title,
        description: card.description,
        responsible: card.responsible,
        color: card.color as CardColor,
        createdAt: card.createdAt.getTime(),
        updatedAt: card.updatedAt.getTime(),
      }
      return card.id
    })
    return { id: col.id, title: col.title, cardIds }
  })

  return { boardId: board.id, boardState: { projectName: board.name, columns, cards } }
}

export async function renameBoardAction(boardId: string, name: string) {
  await verifySession()
  await prisma.board.update({ where: { id: boardId }, data: { name } })
}

export async function addColumnAction(boardId: string, id: string, title: string, position: number) {
  await verifySession()
  await prisma.column.create({ data: { id, boardId, title, position } })
}

export async function renameColumnAction(id: string, title: string) {
  await verifySession()
  await prisma.column.update({ where: { id }, data: { title } })
}

export async function deleteColumnAction(id: string) {
  await verifySession()
  await prisma.column.delete({ where: { id } })
}

export async function reorderColumnsAction(columns: { id: string; position: number }[]) {
  await verifySession()
  await prisma.$transaction(
    columns.map(({ id, position }) => prisma.column.update({ where: { id }, data: { position } }))
  )
}

export async function addCardAction(card: {
  id: string
  columnId: string
  title: string
  description: string
  responsible: string
  color: string
  position: number
}) {
  await verifySession()
  await prisma.card.create({ data: card })
}

export async function updateCardAction(
  id: string,
  data: { title: string; description: string; responsible: string; color: string; sprintId?: string | null; responsibleId?: string | null }
) {
  await verifySession()
  await prisma.card.update({ where: { id }, data })
}

export async function deleteCardAction(id: string) {
  await verifySession()
  await prisma.card.delete({ where: { id } })
}

export async function moveCardAction(
  cardId: string,
  newColumnId: string,
  affectedColumns: { id: string; cardIds: string[] }[]
) {
  await verifySession()
  await prisma.$transaction([
    prisma.card.update({ where: { id: cardId }, data: { columnId: newColumnId } }),
    ...affectedColumns.flatMap(({ id: colId, cardIds }) =>
      cardIds.map((cId, position) =>
        prisma.card.update({ where: { id: cId }, data: { position, columnId: colId } })
      )
    ),
  ])
}
