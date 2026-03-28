'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import SprintHeader from './SprintHeader'
import ColumnComponent from '@/components/board/Column'
import { Column as ColumnType, Card as CardType, CardColor } from '@/types/kanban'
import {
  moveCardInSprintAction,
  addSprintColumnAction,
  renameSprintColumnAction,
  deleteSprintColumnAction,
  reorderSprintColumnsAction,
  createCardInSprintAction,
  updateCardInSprintAction,
  deleteCardInSprintAction,
} from '@/app/actions/sprintBoard'

interface SprintCard {
  id: string
  title: string
  description: string
  responsible: string
  responsibleId?: string | null
  color: string
  sprintPosition?: number | null
  tags?: { tagId: string; tag: { id?: string; name: string; color: string } }[]
  attachments?: { id: string }[]
  timeEntries?: { duration: number }[]
}

interface SprintColumnData {
  id: string
  title: string
  position: number
  cards: SprintCard[]
}

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  startDate: Date | string | null
  endDate: Date | string | null
  description?: string | null
  qualidade?: number | null
  dificuldade?: number | null
}

interface SprintBoardProps {
  sprint: Sprint
  columns: SprintColumnData[]
  boardId: string
  users?: { id: string; name: string; email: string; avatarUrl?: string | null }[]
  tags?: { id: string; name: string; color: string }[]
  currentUser?: { id: string; name: string; email: string; avatarUrl?: string | null } | null
}

function toColumnType(col: SprintColumnData): ColumnType {
  return { id: col.id, title: col.title, cardIds: col.cards.map(c => c.id) }
}

function toCardType(card: SprintCard, sprintId: string): CardType {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? '',
    responsible: card.responsible ?? '',
    responsibleId: card.responsibleId ?? null,
    color: (card.color ?? '#6b7280') as CardColor,
    sprintId,
    tags: card.tags?.map(ct => ({
      tagId: ct.tagId,
      tag: { id: ct.tag.id ?? ct.tagId, name: ct.tag.name, color: ct.tag.color },
    })),
    attachments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export default function SprintBoard({ sprint, columns: initialColumns, boardId, users, tags, currentUser }: SprintBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    if (type === 'COLUMN') {
      const newOrder = [...columns]
      const [moved] = newOrder.splice(source.index, 1)
      newOrder.splice(destination.index, 0, moved)
      setColumns(newOrder)
      await reorderSprintColumnsAction(newOrder.map(c => c.id))
      return
    }

    // type === 'CARD'
    const newColumns = columns.map(col => ({ ...col, cards: [...col.cards] }))
    const srcCol = newColumns.find(c => c.id === source.droppableId)
    const dstCol = newColumns.find(c => c.id === destination.droppableId)
    if (!srcCol || !dstCol) return

    const [movedCard] = srcCol.cards.splice(source.index, 1)
    dstCol.cards.splice(destination.index, 0, movedCard)
    setColumns(newColumns)

    await moveCardInSprintAction(draggableId, destination.droppableId, destination.index)
  }

  async function handleAddColumn() {
    if (!newColTitle.trim()) return
    const result = await addSprintColumnAction(sprint.id, newColTitle.trim())
    if ('column' in result && result.column) {
      setColumns(cols => [...cols, { ...result.column, cards: [] }])
      setNewColTitle('')
      setAddingCol(false)
    }
  }

  async function handleRenameColumn(columnId: string, title: string) {
    setColumns(cols => cols.map(c => c.id === columnId ? { ...c, title } : c))
    await renameSprintColumnAction(columnId, title)
  }

  async function handleDeleteColumn(columnId: string) {
    setColumns(cols => cols.filter(c => c.id !== columnId))
    await deleteSprintColumnAction(columnId)
  }

  async function handleAddCard(columnId: string, data: { title: string; description: string; responsible: string; color: CardColor }) {
    const result = await createCardInSprintAction({
      sprintId: sprint.id,
      sprintColumnId: columnId,
      title: data.title,
      description: data.description,
      color: data.color,
    })
    if ('card' in result && result.card) {
      const newCard: SprintCard = {
        id: result.card.id,
        title: result.card.title,
        description: result.card.description,
        responsible: result.card.responsible,
        color: result.card.color,
        tags: [],
        attachments: [],
        timeEntries: [],
      }
      setColumns(cols => cols.map(col =>
        col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
      ))
    }
  }

  async function handleUpdateCard(
    cardId: string,
    data: { title: string; description: string; responsible: string; color: CardColor; responsibleId?: string | null; sprintId?: string | null },
  ) {
    setColumns(cols => cols.map(col => ({
      ...col,
      cards: col.cards.map(c => c.id === cardId ? { ...c, ...data } : c),
    })))
    await updateCardInSprintAction(cardId, {
      title: data.title,
      description: data.description,
      responsible: data.responsible,
      color: data.color,
      responsibleId: data.responsibleId,
    })
  }

  async function handleDeleteCard(cardId: string) {
    setColumns(cols => cols.map(col => ({
      ...col,
      cards: col.cards.filter(c => c.id !== cardId),
    })))
    await deleteCardInSprintAction(cardId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col pb-16">
      <SprintHeader sprint={sprint} boardId={boardId} currentUser={currentUser} tags={tags} />
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sprint-columns" direction="horizontal" type="COLUMN">
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 items-start"
              >
                {columns.map((col, index) => (
                  <ColumnComponent
                    key={col.id}
                    column={toColumnType(col)}
                    cards={col.cards.map(c => toCardType(c, sprint.id))}
                    index={index}
                    onRenameColumn={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onAddCard={handleAddCard}
                    onUpdateCard={handleUpdateCard}
                    onDeleteCard={(cardId) => handleDeleteCard(cardId)}
                    users={users}
                    boardTags={tags}
                    boardId={boardId}
                    sprints={[]}
                  />
                ))}
                {provided.placeholder}

                {/* Add column */}
                <div className="w-72 shrink-0">
                  {addingCol ? (
                    <div className="bg-white/80 rounded-xl p-3 space-y-2">
                      <input
                        autoFocus
                        value={newColTitle}
                        onChange={e => setNewColTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddColumn()
                          if (e.key === 'Escape') setAddingCol(false)
                        }}
                        placeholder="Nome da coluna"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="Nome da nova coluna"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddColumn}
                          className="flex-1 bg-blue-600 text-white text-sm py-1 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => setAddingCol(false)}
                          className="flex-1 bg-gray-100 text-gray-600 text-sm py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCol(true)}
                      className="w-full flex items-center gap-2 px-4 py-3 bg-white/50 hover:bg-white/70 rounded-xl text-sm text-gray-600 hover:text-gray-800 transition-all font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nova Coluna
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  )
}
