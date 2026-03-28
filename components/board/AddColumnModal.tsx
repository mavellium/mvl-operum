'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface AddColumnModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string) => void
}

export default function AddColumnModal({ isOpen, onClose, onAdd }: AddColumnModalProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setTitle(''); setError('') }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('O nome é obrigatório.'); return }
    onAdd(title.trim())
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Coluna">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da coluna <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setError('') }}
            placeholder="Ex: Em Revisão"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-400 transition"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Criar Coluna</Button>
        </div>
      </form>
    </Modal>
  )
}
