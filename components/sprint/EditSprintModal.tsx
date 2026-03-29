'use client'

import { useState } from 'react'
import { updateSprintMetaAction } from '@/app/actions/sprintBoard'

interface Sprint {
  id: string
  name: string
  startDate?: string | Date | null
  endDate?: string | Date | null
}

interface Props {
  sprint: Sprint
  onClose: () => void
  onUpdated: (sprint: { name: string; startDate: string | null; endDate: string | null }) => void
}

function toDateInputValue(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

export default function EditSprintModal({ sprint, onClose, onUpdated }: Props) {
  const [name, setName] = useState(sprint.name)
  const [startDate, setStartDate] = useState(toDateInputValue(sprint.startDate))
  const [endDate, setEndDate] = useState(toDateInputValue(sprint.endDate))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('O nome da sprint é obrigatório.')
      return
    }
    setLoading(true)
    const result = await updateSprintMetaAction(sprint.id, {
      name: name.trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error ?? 'Erro desconhecido')
      return
    }
    onUpdated({
      name: name.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Editar Sprint</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sprint-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="sprint-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label htmlFor="sprint-start" className="block text-sm font-medium text-gray-700 mb-1">
              Data de início
            </label>
            <input
              id="sprint-start"
              type="date"
              aria-label="Data de início"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="sprint-end" className="block text-sm font-medium text-gray-700 mb-1">
              Data de fim
            </label>
            <input
              id="sprint-end"
              type="date"
              aria-label="Data de fim"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
