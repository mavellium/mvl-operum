'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ColorPicker from './ColorPicker'
import CardAttachments from './CardAttachments'
import UserSelector from '@/components/user/UserSelector'
import { SprintSelector } from '@/components/sprint/SprintSelector'
import { TagSelector } from '@/components/tag/TagSelector'
import { assignTagToCardAction, removeTagFromCardAction } from '@/app/actions/tags'
import { Card, CardColor, Attachment } from '@/types/kanban'
import CardTimer from './CardTimer'
import MultiUserSelector from './MultiUserSelector'

interface User {
  id: string
  name: string
  email: string
}

interface Sprint {
  id: string
  name: string
  status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description: string
    responsible: string
    color: CardColor
    responsibleId?: string | null
    sprintId?: string | null
  }) => void
  initialCard?: Card
  // Optional extended props
  users?: User[]
  sprints?: Sprint[]
  boardTags?: Tag[]
  boardId?: string
  attachments?: Attachment[]
  onAttachmentUpload?: (file: File) => void
  onAttachmentDelete?: (attachmentId: string) => void
}

const DEFAULT_COLOR: CardColor = '#6b7280'

export default function CardModal({
  isOpen,
  onClose,
  onSubmit,
  initialCard,
  users,
  sprints,
  boardTags,
  boardId,
  attachments,
  onAttachmentUpload,
  onAttachmentDelete,
}: CardModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [responsible, setResponsible] = useState('')
  const [responsibleId, setResponsibleId] = useState<string | null>(null)
  const [color, setColor] = useState<CardColor>(DEFAULT_COLOR)
  const [sprintId, setSprintId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialCard?.title ?? '')
      setDescription(initialCard?.description ?? '')
      setResponsible(initialCard?.responsible ?? '')
      setResponsibleId(initialCard?.responsibleId ?? null)
      setColor(initialCard?.color ?? DEFAULT_COLOR)
      setSprintId(initialCard?.sprintId ?? null)
      setSelectedTagIds(initialCard?.tags?.map(t => t.tagId) ?? [])
      setError('')
    }
  }, [isOpen, initialCard])

  const handleResponsibleChange = (userId: string | null) => {
    setResponsibleId(userId)
    if (userId && users) {
      const user = users.find(u => u.id === userId)
      if (user) setResponsible(user.name)
    } else if (!userId) {
      setResponsible('')
    }
  }

  const handleTagToggle = async (tagId: string) => {
    if (!initialCard) return
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(ids => ids.filter(id => id !== tagId))
      await removeTagFromCardAction(initialCard.id, tagId)
    } else {
      setSelectedTagIds(ids => [...ids, tagId])
      await assignTagToCardAction(initialCard.id, tagId)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      responsible: responsible.trim(),
      color,
      responsibleId,
      sprintId,
    })
    onClose()
  }

  const isEditing = !!initialCard

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Card' : 'Novo Card'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setError('') }}
            placeholder="Ex: Implementar autenticação"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descreva a tarefa..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition resize-none"
          />
        </div>

        {users ? (
          <UserSelector
            users={users}
            value={responsibleId}
            onChange={handleResponsibleChange}
            label="Responsável"
          />
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <input
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              placeholder="Nome do responsável"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {sprints && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sprint</label>
            <SprintSelector
              sprints={sprints.map(s => ({ ...s, status: s.status ?? 'PLANNED' }))}
              selectedSprintId={sprintId}
              onSelect={setSprintId}
            />
          </div>
        )}

        {boardTags && boardTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <TagSelector
              tags={boardTags}
              selectedTagIds={selectedTagIds}
              onToggle={handleTagToggle}
            />
          </div>
        )}

        {isEditing && initialCard && users && users.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responsáveis</label>
            <MultiUserSelector cardId={initialCard.id} users={users} />
          </div>
        )}

        {isEditing && initialCard && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tempo</label>
            <CardTimer cardId={initialCard.id} />
          </div>
        )}

        {attachments !== undefined && onAttachmentUpload && onAttachmentDelete && (
          <CardAttachments
            attachments={attachments}
            onUpload={onAttachmentUpload}
            onDelete={onAttachmentDelete}
          />
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{isEditing ? 'Salvar' : 'Criar Card'}</Button>
        </div>
      </form>
    </Modal>
  )
}
