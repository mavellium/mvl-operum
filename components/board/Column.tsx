'use client'

import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { Column as ColumnType, Card as CardType, CardColor } from '@/types/kanban'
import ColumnHeader from './ColumnHeader'
import CardComponent from '@/components/card/Card'
import CardModal from '@/components/card/CardModal'

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

interface ColumnProps {
  column: ColumnType
  cards: CardType[]
  index: number
  onRenameColumn: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onAddCard: (columnId: string, data: { title: string; description: string; color: CardColor }) => void
  onUpdateCard: (cardId: string, data: { title: string; description: string; color: CardColor }) => void
  onDeleteCard: (cardId: string, columnId: string) => void
  users?: User[]
  boardTags?: Tag[]
}

export default function Column({
  column, cards, index,
  onRenameColumn, onDeleteColumn,
  onAddCard, onUpdateCard, onDeleteCard,
  users, boardTags,
}: ColumnProps) {
  const [addCardOpen, setAddCardOpen] = useState(false)

  return (
    <>
      <Draggable draggableId={column.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`flex flex-col w-72 shrink-0 h-full bg-gray-100 rounded-2xl transition-shadow
              ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-300 rotate-1' : 'shadow-sm'}`}
          >
            <ColumnHeader
              title={column.title}
              cardCount={cards.length}
              dragHandleProps={provided.dragHandleProps}
              onRename={title => onRenameColumn(column.id, title)}
              onDelete={() => onDeleteColumn(column.id)}
            />

            <Droppable droppableId={column.id} type="CARD">
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={`flex-1 min-h-0 px-2 pb-2 flex flex-col gap-2 rounded-b-2xl transition-colors overflow-y-auto
                    ${dropSnapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                >
                  {cards.length === 0 && !dropSnapshot.isDraggingOver && (
                    <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded-xl text-xs text-gray-400">
                      Arraste cards aqui
                    </div>
                  )}
                  {cards.map((card, i) => (
                    <CardComponent
                      key={card.id}
                      card={card}
                      index={i}
                      columnId={column.id}
                      onUpdate={onUpdateCard}
                      onDelete={onDeleteCard}
                      users={users}
                      boardTags={boardTags}
                    />
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="p-2">
              <button
                onClick={() => setAddCardOpen(true)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-white rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar card
              </button>
            </div>
          </div>
        )}
      </Draggable>

      <CardModal
        isOpen={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onSubmit={data => onAddCard(column.id, data)}
        users={users}
        boardTags={boardTags}
      />
    </>
  )
}
