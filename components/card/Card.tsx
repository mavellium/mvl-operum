'use client'

import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Card as CardType, CardColor } from '@/types/kanban'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TagBadge } from '@/components/tag/TagBadge'
import UserAvatar from '@/components/user/UserAvatar'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CardProps {
  card: CardType
  index: number
  columnId: string
  onUpdate: (cardId: string, data: { title: string; description: string; color: CardColor }) => void
  onDelete: (cardId: string, columnId: string) => void
  users?: User[]
  boardTags?: Tag[]
  onClick: () => void
}

export default function Card({ card, index, columnId, onUpdate: _onUpdate, onDelete, users: _users, boardTags: _boardTags, onClick }: CardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const hasDescription = !!card.description?.trim()
  const hasComments = false
  const hasAttachments = card.attachments && card.attachments.length > 0
  const cover = card.attachments?.find(a => a.isCover)

  // Função isolada para o botão de Timer não propagar o clique para abrir o Modal
  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Impede que o click "suba" para o div principal do card
    setIsTimerRunning(!isTimerRunning)
    // Aqui você chamaria a API para Iniciar/Pausar o tracker real no banco
  }

  return (
    <>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`group bg-white rounded-xl shadow-sm border border-gray-200/75 overflow-hidden cursor-pointer transition-all duration-200 flex flex-col
              ${snapshot.isDragging ? 'shadow-2xl rotate-2 ring-2 ring-blue-400 scale-105 z-50' : 'hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:scale-[0.98]'}`}
            style={{
              ...provided.draggableProps.style,
              borderLeftWidth: cover ? '0' : '4px', // Tira a borda colorida esquerda se tiver capa, para ficar mais bonito
              borderLeftColor: card.color,
              borderTopWidth: cover ? '4px' : '0', // Joga a cor para o topo caso tenha capa
              borderTopColor: cover ? card.color : 'transparent'
            }}
            onClick={onClick}
          >

            {/* CAPA DA IMAGEM FULL WIDTH */}
            {cover && (
              <div className="w-full h-32 overflow-hidden border-b border-gray-100 bg-gray-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.filePath}
                  alt="Capa"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}

            <div className="p-3.5 flex-1 flex flex-col">

              {/* ETIQUETAS (TAGS) */}
              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {card.tags.map(ct => (
                    <TagBadge key={ct.tagId} name={ct.tag.name} color={ct.tag.color} className="text-[10px] px-2 py-0.5" />
                  ))}
                </div>
              )}

              {/* TÍTULO E BOTÃO EXCLUIR */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[14px] font-bold text-gray-800 leading-snug flex-1 break-words">
                  {card.title}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-1 -mr-1">
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Excluir card"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Espaçador flexível empurra o rodapé para baixo se o card crescer */}
              <div className="flex-1" />

              {/* RODAPÉ DO CARD */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2">

                {/* Lado Esquerdo: Ícones Grandes e Timer Interactive */}
                <div className="flex items-center gap-3.5 text-gray-500">

                  {(hasDescription || hasAttachments || hasComments) && (
                    <div className="flex items-center gap-2.5">
                      {hasDescription && (
                        <div title="Este card possui uma descrição" className="flex items-center justify-center">
                          {/* Ícone de descrição aumentado para w-4 h-4 */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        </div>
                      )}
                      {hasAttachments && (
                        <div className="flex items-center gap-1 text-xs font-semibold" title="Anexos">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {card.attachments?.length}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rastreador de Tempo Interactive */}
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md transition-colors ${isTimerRunning ? 'bg-green-50' : 'hover:bg-gray-100'}`}
                    onClick={handleTimerClick}
                    title={isTimerRunning ? "Pausar tempo" : "Iniciar tempo"}
                  >
                    {isTimerRunning ? (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm hover:bg-red-200 transition-colors">
                        {/* Ícone de Pause/Stop */}
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-100 hover:text-green-600 transition-colors shadow-sm">
                        {/* Ícone de Play */}
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                    <span className={`text-xs font-mono font-bold tracking-tight mt-px ${isTimerRunning ? 'text-green-700' : 'text-gray-600'}`}>01:23</span>
                  </div>

                </div>

                {/* Lado Direito: Prioridade e Avatares Grandes */}
                <div className="flex items-center gap-2.5">
                  {card.priority && (
                    <div className="flex items-center gap-1.5 px-1">
                      <div className={`w-2 h-2 rounded-full ${card.priority === 'alta' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' :
                          card.priority === 'media' ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]' :
                            'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'
                        }`} />
                      <span className="text-[11px] font-bold text-gray-600 capitalize tracking-wide">
                        {card.priority}
                      </span>
                    </div>
                  )}

                  {/* AVATARES */}
                  {card.responsibles && card.responsibles.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden hover:space-x-0.5 transition-all duration-300">
                      {card.responsibles.slice(0, 3).map(r => (
                        <div key={r.user.id} className="ring-[2px] ring-white rounded-full bg-gray-200 shrink-0">
                          {/* Se tiver foto, mostra a foto real maior (w-6 h-6 = size sm em vez de xs) */}
                          <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} size="sm" />
                        </div>
                      ))}
                      {card.responsibles.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 z-10 shadow-sm shrink-0">
                          +{card.responsibles.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </Draggable>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(card.id, columnId)}
        title="Excluir card"
        message={`Tem certeza que deseja excluir o card "${card.title}"? Esta ação não pode ser desfeita.`}
      />
    </>
  )
}