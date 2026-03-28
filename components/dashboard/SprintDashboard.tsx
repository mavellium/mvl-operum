'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import KPICard from './KPICard'
import { updateSprintMetaAction } from '@/app/actions/sprintBoard'

interface Sprint {
  id: string
  name: string
  status: string
  startDate: Date | string | null
  endDate: Date | string | null
  qualidade: number | null
  dificuldade: number | null
}

interface SprintMetrics {
  horasTotais: number
  custoTotal: number
  cardsTotal: number
  cardsConcluidos: number
  cardsAtrasados: number
}

interface SprintDashboardProps {
  sprint: Sprint
  metrics: SprintMetrics
}

function formatDate(date: Date | string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatHours(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}h ${mm.toString().padStart(2, '0')}m`
}

const statusLabel: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
}

export default function SprintDashboard({ sprint: initialSprint, metrics }: SprintDashboardProps) {
  const [sprint, setSprint] = useState(initialSprint)
  const [qualidade, setQualidade] = useState(sprint.qualidade?.toString() ?? '')
  const [dificuldade, setDificuldade] = useState(sprint.dificuldade?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  const conclusaoPercent = metrics.cardsTotal > 0
    ? Math.round((metrics.cardsConcluidos / metrics.cardsTotal) * 100)
    : 0

  function handleSaveMeta() {
    startTransition(async () => {
      const result = await updateSprintMetaAction(sprint.id, {
        qualidade: qualidade ? Number(qualidade) : undefined,
        dificuldade: dificuldade ? Number(dificuldade) : undefined,
      })
      if ('sprint' in result && result.sprint) {
        setSprint(s => ({ ...s, qualidade: result.sprint.qualidade, dificuldade: result.sprint.dificuldade }))
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/sprints" className="text-gray-400 hover:text-gray-600 text-sm">← Sprints</Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{statusLabel[sprint.status] ?? sprint.status}</span>
              <span>·</span>
              <span>{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</span>
            </div>
          </div>
          <Link
            href={`/sprints/${sprint.id}`}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Abrir Board
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          <KPICard label="Cards" value={String(metrics.cardsTotal)} />
          <KPICard label="Concluídos" value={`${conclusaoPercent}%`} color="green" />
          <KPICard label="Horas" value={formatHours(metrics.horasTotais)} color="purple" />
          <KPICard label="Custo" value={formatCurrency(metrics.custoTotal)} color="amber" />
        </div>

        {/* Qualidade e Dificuldade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Avaliação da Sprint</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="qualidade" className="block text-xs font-medium text-gray-600 mb-1">
                Qualidade (0–10)
              </label>
              <input
                id="qualidade"
                type="number"
                min={0}
                max={10}
                value={qualidade}
                onChange={e => setQualidade(e.target.value)}
                placeholder="0-10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="dificuldade" className="block text-xs font-medium text-gray-600 mb-1">
                Nível de Dificuldade (0–10)
              </label>
              <input
                id="dificuldade"
                type="number"
                min={0}
                max={10}
                value={dificuldade}
                onChange={e => setDificuldade(e.target.value)}
                placeholder="0-10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <button
            onClick={handleSaveMeta}
            disabled={isPending}
            className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Salvando...' : 'Salvar avaliação'}
          </button>
        </div>

        {/* Stats */}
        {metrics.cardsAtrasados > 0 && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
            ⚠️ {metrics.cardsAtrasados} card{metrics.cardsAtrasados !== 1 ? 's' : ''} atrasado{metrics.cardsAtrasados !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
