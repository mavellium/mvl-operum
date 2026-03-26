'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ColorPicker from './ColorPicker'
import { Card, CardColor } from '@/types/kanban'

interface CardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; description: string; responsible: string; color: CardColor }) => void
  initialCard?: Card
}

const DEFAULT_COLOR: CardColor = '#6b7280'

export default function CardModal({ isOpen, onClose, onSubmit, initialCard }: CardModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [responsible, setResponsible] = useState('')
  const [color, setColor] = useState<CardColor>(DEFAULT_COLOR)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialCard?.title ?? '')
      setDescription(initialCard?.description ?? '')
      setResponsible(initialCard?.responsible ?? '')
      setColor(initialCard?.color ?? DEFAULT_COLOR)
      setError('')
    }
  }, [isOpen, initialCard])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    onSubmit({ title: title.trim(), description: description.trim(), responsible: responsible.trim(), color })
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
          <input
            value={responsible}
            onChange={e => setResponsible(e.target.value)}
            placeholder="Nome do responsável"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{isEditing ? 'Salvar' : 'Criar Card'}</Button>
        </div>
      </form>
    </Modal>
  )
}
