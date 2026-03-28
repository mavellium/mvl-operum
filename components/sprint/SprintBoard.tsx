'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import SprintHeader from './SprintHeader'
import { moveCardInSprintAction, addSprintColumnAction } from '@/app/actions/sprintBoard'

interface SprintCard {
  id: string
  title: string
  description: string
  responsible: string
  color: string
  sprintPosition?: number | null
  tags?: { tagId: string; tag: { name: string; color: string } }[]
}

interface SprintColumn {
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
  columns: SprintColumn[]
}

export default function SprintBoard({ sprint, columns: initialColumns }: SprintBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newColumns = columns.map(col => ({ ...col, cards: [...col.cards] }))
    const srcCol = newColumns.find(c => c.id === source.droppableId)
    const dstCol = newColumns.find(c => c.id === destination.droppableId)
    if (!srcCol || !dstCol) return

    const [moved] = srcCol.cards.splice(source.index, 1)
    dstCol.cards.splice(destination.index, 0, moved)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col">
      <SprintHeader sprint={sprint} />
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full items-start">
            {columns.map(col => (
              <div key={col.id} className="flex flex-col w-72 shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{col.title}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {col.cards.length}
                  </span>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white/60'
                      }`}
                    >
                      {col.cards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`bg-white rounded-lg border border-gray-100 p-3 cursor-grab transition-all ${
                                dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300' : 'hover:shadow-md'
                              }`}
                              style={{
                                ...dragProvided.draggableProps.style,
                                borderLeftWidth: '4px',
                                borderLeftColor: card.color,
                              }}
                            >
                              <p className="text-sm font-medium text-gray-900 break-words">{card.title}</p>
                              {card.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                              )}
                              {card.responsible && (
                                <p className="text-xs text-gray-400 mt-1">@{card.responsible}</p>
                              )}
                              {card.tags && card.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {card.tags.map(ct => (
                                    <span
                                      key={ct.tagId}
                                      className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                                      style={{ backgroundColor: ct.tag.color }}
                                    >
                                      {ct.tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

            {/* Add column */}
            <div className="w-72 shrink-0">
              {addingCol ? (
                <div className="bg-white/80 rounded-xl p-3 space-y-2">
                  <input
                    autoFocus
                    value={newColTitle}
                    onChange={e => setNewColTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setAddingCol(false) }}
                    placeholder="Nome da coluna"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Nome da nova coluna"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddColumn} className="flex-1 bg-blue-600 text-white text-sm py-1 rounded-lg hover:bg-blue-700 transition-colors">
                      Adicionar
                    </button>
                    <button onClick={() => setAddingCol(false)} className="flex-1 bg-gray-100 text-gray-600 text-sm py-1 rounded-lg hover:bg-gray-200 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-full h-12 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nova Coluna
                </button>
              )}
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
