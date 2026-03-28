'use client'

import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { BoardState, CardColor } from '@/types/kanban'
import { KanbanAction } from '@/lib/kanbanReducer'
import { buildDragAction } from '@/lib/reorderUtils'
import Column from './Column'

interface Sprint {
  id: string
  name: string
  status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
}

interface User {
  id: string
  name: string
  email: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface ColumnListProps {
  state: BoardState
  dispatch: React.Dispatch<KanbanAction>
  visibleCardIds?: string[] | null
  sprints?: Sprint[]
  users?: User[]
  boardTags?: Tag[]
  boardId?: string
}

export default function ColumnList({ state, dispatch, visibleCardIds, sprints, users, boardTags, boardId }: ColumnListProps) {
  const handleDragEnd = (result: DropResult) => {
    const action = buildDragAction(result)
    if (action) dispatch(action)
  }

  const handleAddCard = (columnId: string, data: { title: string; description: string; responsible: string; color: CardColor }) => {
    dispatch({ type: 'ADD_CARD', payload: { columnId, ...data } })
  }

  const handleUpdateCard = (cardId: string, data: { title: string; description: string; responsible: string; color: CardColor; responsibleId?: string | null; sprintId?: string | null }) => {
    dispatch({ type: 'UPDATE_CARD', payload: { cardId, ...data } })
  }

  const handleDeleteCard = (cardId: string, columnId: string) => {
    dispatch({ type: 'DELETE_CARD', payload: { cardId, columnId } })
  }

  const handleRenameColumn = (columnId: string, title: string) => {
    dispatch({ type: 'RENAME_COLUMN', payload: { columnId, title } })
  }

  const handleDeleteColumn = (columnId: string) => {
    dispatch({ type: 'DELETE_COLUMN', payload: { columnId } })
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 items-start pb-6 min-h-full"
          >
            {state.columns.map((col, index) => {
              const allCards = col.cardIds.map(id => state.cards[id]).filter(Boolean)
              const cards = visibleCardIds
                ? allCards.filter(card => visibleCardIds.includes(card.id))
                : allCards
              return (
                <Column
                  key={col.id}
                  column={col}
                  cards={cards}
                  index={index}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onAddCard={handleAddCard}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                  sprints={sprints}
                  users={users}
                  boardTags={boardTags}
                  boardId={boardId}
                />
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
