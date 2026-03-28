'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SprintBadge } from './SprintBadge'
import { SprintManager } from './SprintManager'

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  startDate: Date | string | null | undefined
  endDate: Date | string | null | undefined
}

interface SprintListPageProps {
  sprints: Sprint[]
  boardId: string
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SprintListPage({ sprints: initialSprints, boardId }: SprintListPageProps) {
  const [sprints, setSprints] = useState(initialSprints)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
            <p className="text-sm text-gray-500 mt-1">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Sprint
          </button>
        </div>

        {/* Sprint list */}
        {sprints.length === 0 && !showCreate ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400 text-sm">Nenhuma sprint criada ainda</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-blue-600 text-sm hover:underline"
            >
              Criar a primeira sprint
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sprints.map(sprint => (
              <div
                key={sprint.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-gray-900 truncate">{sprint.name}</h2>
                    <SprintBadge name="" status={sprint.status} />
                  </div>
                  {(sprint.startDate || sprint.endDate) && (
                    <p className="text-xs text-gray-400">
                      {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/sprint/${sprint.id}`}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/sprints/${sprint.id}`}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    aria-label={`Abrir board da ${sprint.name}`}
                  >
                    Abrir Board
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create sprint form */}
        {showCreate && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <SprintManager
              boardId={boardId}
              sprints={sprints}
              onSprintCreated={(sprint) => {
                setSprints(prev => [...prev, { ...sprint, startDate: sprint.startDate ?? null, endDate: sprint.endDate ?? null }])
                setShowCreate(false)
              }}
            />
            <button
              onClick={() => setShowCreate(false)}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
