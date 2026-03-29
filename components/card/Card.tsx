'use client'

import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Card as CardType, CardColor } from '@/types/kanban'
import CardModal from './CardModal'
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
}

export default function Card({ card, index, columnId, onUpdate, onDelete, users, boardTags }: CardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transition-all
              ${snapshot.isDragging ? 'shadow-xl rotate-1 ring-2 ring-blue-300' : 'hover:shadow-md'}`}
            style={{
              ...provided.draggableProps.style,
              borderLeftWidth: '4px',
              borderLeftColor: card.color,
            }}
            onClick={() => setEditOpen(true)}
          >
            {(() => {
              const cover = card.attachments?.find(a => a.isCover)
              if (!cover) return null
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.filePath} alt="Capa" className="w-full h-24 object-cover" />
              )
            })()}
            <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 leading-snug flex-1 break-words">{card.title}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Excluir card"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {card.description && (
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{card.description}</p>
            )}

            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.map(ct => (
                  <TagBadge key={ct.tagId} name={ct.tag.name} color={ct.tag.color} />
                ))}
              </div>
            )}

            {(card.priority || (card.responsibles && card.responsibles.length > 0)) && (
              <div className="flex items-center justify-between mt-2 gap-2">
                {card.priority && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    card.priority === 'alta'
                      ? 'bg-red-100 text-red-700'
                      : card.priority === 'media'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {card.priority}
                  </span>
                )}
                {card.responsibles && card.responsibles.length > 0 && (
                  <div className="flex items-center gap-0.5 ml-auto">
                    {card.responsibles.slice(0, 3).map(r => (
                      <UserAvatar key={r.user.id} name={r.user.name} avatarUrl={r.user.avatarUrl} size="xs" />
                    ))}
                    {card.responsibles.length > 3 && (
                      <span className="text-xs text-gray-400 ml-0.5">+{card.responsibles.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </Draggable>

      <CardModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={data => onUpdate(card.id, data)}
        initialCard={card}
        users={users}
        boardTags={boardTags}
        attachments={card.attachments ?? []}
        onAttachmentUpload={async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('cardId', card.id)
          await fetch('/api/uploads', { method: 'POST', body: fd })
        }}
        onAttachmentDelete={async (attachmentId) => {
          await fetch(`/api/uploads?id=${attachmentId}`, { method: 'DELETE' })
        }}
        onAttachmentSetCover={async (attachmentId) => {
          const { setCoverAction } = await import('@/app/actions/attachments')
          await setCoverAction(card.id, attachmentId)
        }}
      />

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
