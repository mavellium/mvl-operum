'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateSprintMetaAction } from '@/app/actions/sprintBoard'

interface SprintHeaderProps {
  sprint: {
    id: string
    name: string
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
    startDate: Date | string | null
    endDate: Date | string | null
    description?: string | null
    qualidade?: number | null
    dificuldade?: number | null
  }
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

function formatDate(d: Date | string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function SprintHeader({ sprint }: SprintHeaderProps) {
  const [qualidade, setQualidade] = useState(sprint.qualidade?.toString() ?? '')
  const [dificuldade, setDificuldade] = useState(sprint.dificuldade?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveMeta() {
    setSaving(true)
    await updateSprintMetaAction(sprint.id, {
      qualidade: qualidade ? Number(qualidade) : undefined,
      dificuldade: dificuldade ? Number(dificuldade) : undefined,
    })
    setSaving(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-4 mb-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Voltar ao board">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl font-bold text-gray-900">{sprint.name}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[sprint.status]}`}>
            {STATUS_LABELS[sprint.status]}
          </span>
        </div>
        {(sprint.startDate || sprint.endDate) && (
          <div className="text-sm text-gray-500 hidden sm:block">
            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Qualidade (0–10):</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={qualidade}
            onChange={e => setQualidade(e.target.value)}
            onBlur={handleSaveMeta}
            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
            placeholder="—"
            aria-label="Qualidade da sprint"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Dificuldade (0–10):</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={dificuldade}
            onChange={e => setDificuldade(e.target.value)}
            onBlur={handleSaveMeta}
            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
            placeholder="—"
            aria-label="Dificuldade da sprint"
          />
        </div>
        {saving && <span className="text-xs text-gray-400">Salvando...</span>}
      </div>
    </header>
  )
}
