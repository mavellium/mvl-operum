'use client'

import { useState, useTransition } from 'react'
import { SprintBadge } from './SprintBadge'
import { createSprintAction } from '@/app/actions/sprints'

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
}

interface SprintManagerProps {
  boardId: string
  sprints: Sprint[]
}

export function SprintManager({ boardId, sprints: initialSprints }: SprintManagerProps) {
  const [sprints, setSprints] = useState(initialSprints)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createSprintAction(undefined, { name: newName.trim(), boardId })
      if (result?.sprint) {
        setSprints((prev) => [...prev, result.sprint as Sprint])
        setNewName('')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">Sprints</h3>
      <div className="flex flex-col gap-2">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="flex items-center gap-2">
            <SprintBadge name={sprint.name} status={sprint.status} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo sprint"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Criar
        </button>
      </div>
    </div>
  )
}
