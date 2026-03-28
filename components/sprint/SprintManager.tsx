'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { SprintBadge } from './SprintBadge'
import { createSprintAction } from '@/app/actions/sprints'

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface SprintManagerProps {
  boardId: string
  sprints: Sprint[]
  onSprintCreated?: (sprint: Sprint) => void
}

export function SprintManager({ boardId, sprints: initialSprints, onSprintCreated }: SprintManagerProps) {
  const [sprints, setSprints] = useState(initialSprints)
  const [newName, setNewName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!newName.trim()) return

    if (startDate && endDate && endDate < startDate) {
      setDateError('Data de fim deve ser após a data de início')
      return
    }
    setDateError('')

    startTransition(async () => {
      const result = await createSprintAction(undefined, {
        name: newName.trim(),
        boardId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      if (result?.sprint) {
        const created = result.sprint as Sprint
        setSprints((prev) => [...prev, created])
        setNewName('')
        setStartDate('')
        setEndDate('')
        onSprintCreated?.(created)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">Sprints</h3>
      <div className="flex flex-col gap-2">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="flex items-center justify-between gap-2">
            <SprintBadge name={sprint.name} status={sprint.status} />
            <Link
              href={`/sprints/${sprint.id}`}
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              aria-label={`Abrir board da ${sprint.name}`}
            >
              Abrir Board
            </Link>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="sprint-name" className="text-xs font-medium text-gray-600">Nome</label>
        <input
          id="sprint-name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da sprint"
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          aria-label="Nome"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="sprint-start" className="text-xs font-medium text-gray-600">Data de início</label>
            <input
              id="sprint-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Data de início"
            />
          </div>
          <div>
            <label htmlFor="sprint-end" className="text-xs font-medium text-gray-600">Data de fim</label>
            <input
              id="sprint-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Data de fim"
            />
          </div>
        </div>
        {dateError && <p className="text-xs text-red-500">{dateError}</p>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </div>
  )
}
