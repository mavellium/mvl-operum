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
            /* Removi o h-full. 
               O max-h-full faz ela parar de crescer no limite do board.
               O overflow-hidden garante que a coluna não "vaze" o scroll pra fora dos cantos arredondados.
            */
            className={`flex flex-col w-72 sm:w-80 max-h-full shrink-0 bg-gray-100/90 backdrop-blur-sm rounded-2xl transition-shadow overflow-hidden
              ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-300 rotate-1' : 'shadow-sm border border-black/5'}`}
          >
            <div {...provided.dragHandleProps}>
              <ColumnHeader
                title={column.title}
                cardCount={cards.length}
                onRename={title => onRenameColumn(column.id, title)}
                onDelete={() => onDeleteColumn(column.id)} dragHandleProps={undefined} />
            </div>

            <Droppable droppableId={column.id} type="CARD">
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  /* AQUI: 
                     - overflow-y-auto: Só cria scroll se passar do max-h-full da div pai.
                     - min-h-0: Permite o encolhimento se necessário.
                  */
                  className={`px-2 pb-2 flex flex-col gap-2 overflow-y-auto min-h-0 transition-colors
                    [&::-webkit-scrollbar]:w-1.5 
                    [&::-webkit-scrollbar-thumb]:bg-black/10 
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    hover:[&::-webkit-scrollbar-thumb]:bg-black/20
                    ${dropSnapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                >
                  {cards.length === 0 && !dropSnapshot.isDraggingOver && (
                    <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded-xl text-xs text-gray-400 mx-2 mt-2">
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

            <div className="p-2 border-t border-black/5 bg-gray-100 rounded-b-2xl">
              <button
                onClick={() => setAddCardOpen(true)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all active:scale-[0.98]"
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