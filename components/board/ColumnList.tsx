'use client'

import { useState } from 'react'
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
  sprints?: Sprint[]
  users?: User[]
  boardTags?: Tag[]
  boardId?: string
}

export default function ColumnList({ state, dispatch, sprints, users, boardTags, boardId }: ColumnListProps) {
  const [addingList, setAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')

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

  const handleAddList = () => {
    if (!newListTitle.trim()) return
    dispatch({ type: 'ADD_COLUMN', payload: { title: newListTitle.trim() } })
    setNewListTitle('')
    setAddingList(false)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-3 items-start pb-6 min-h-full"
          >
            {state.columns.map((col, index) => {
              const cards = col.cardIds.map(id => state.cards[id]).filter(Boolean)
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

            {/* Add another list — Trello style */}
            <div className="flex-shrink-0 w-72">
              {addingList ? (
                <div className="bg-white/90 rounded-xl p-3 shadow-sm space-y-2">
                  <input
                    autoFocus
                    value={newListTitle}
                    onChange={e => setNewListTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false) }}
                    placeholder="Nome da lista"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Nome da nova lista"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddList}
                      className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Adicionar lista
                    </button>
                    <button
                      onClick={() => { setAddingList(false); setNewListTitle('') }}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                      aria-label="Cancelar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white/50 hover:bg-white/70 rounded-xl text-sm text-gray-600 hover:text-gray-800 transition-all font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar outra lista
                </button>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
