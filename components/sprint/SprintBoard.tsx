'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import SprintHeader from './SprintHeader'
import { moveCardInSprintAction, addSprintColumnAction, createCardInSprintAction } from '@/app/actions/sprintBoard'

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
  users?: { id: string; name: string; email: string; avatarUrl?: string | null }[]
  tags?: { id: string; name: string; color: string }[]
}

function AddCardInline({ sprintId, columnId, onAdded }: { sprintId: string; columnId: string; onAdded: (card: SprintCard) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    const result = await createCardInSprintAction({ sprintId, sprintColumnId: columnId, title: title.trim() })
    setSaving(false)
    if ('card' in result && result.card) {
      onAdded({
        id: result.card.id,
        title: result.card.title,
        description: result.card.description,
        responsible: result.card.responsible,
        color: result.card.color,
        tags: [],
      })
      setTitle('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-colors mt-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar card
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } if (e.key === 'Escape') setOpen(false) }}
        placeholder="Título do card..."
        rows={2}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        aria-label="Título do novo card"
      />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={saving || !title.trim()}
          className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Criando...' : 'Adicionar card'}
        </button>
        <button onClick={() => { setOpen(false); setTitle('') }} className="p-1.5 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
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

  function handleCardAdded(columnId: string, card: SprintCard) {
    setColumns(cols => cols.map(col =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col pb-16">
      <SprintHeader sprint={sprint} />
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full items-start">
            {columns.map(col => (
              <div key={col.id} className="flex flex-col w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{col.title}</h3>
                  <span className="text-xs text-gray-400 bg-white/60 rounded-full px-2 py-0.5">
                    {col.cards.length}
                  </span>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-2 min-h-[80px] rounded-xl p-2 transition-colors ${
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
                                dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300 rotate-1' : 'shadow-sm hover:shadow-md hover:bg-gray-50'
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
                <AddCardInline
                  sprintId={sprint.id}
                  columnId={col.id}
                  onAdded={(card) => handleCardAdded(col.id, card)}
                />
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
        </DragDropContext>
      </div>
    </div>
  )
}
