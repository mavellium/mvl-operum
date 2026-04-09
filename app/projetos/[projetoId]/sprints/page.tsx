import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import { findAllByProjeto } from '@/services/sprintService'
import { getSprintMetrics } from '@/services/dashboardService'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SPRINT_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED:   { label: 'Planejada',  cls: 'bg-gray-100 text-gray-600' },
  ACTIVE:    { label: 'Ativa',      cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Concluída',  cls: 'bg-blue-100 text-blue-700' },
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default async function ProjetoSprintsPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { role } = await verifySession()
  const canEdit = role === 'admin' || role === 'gerente'

  const [projeto, sprints] = await Promise.all([
    findById(projetoId),
    findAllByProjeto(projetoId),
  ])

  if (!projeto) notFound()

  const sprintsWithMetrics = await Promise.all(
    sprints.map(async s => ({ sprint: s, metrics: await getSprintMetrics(s.id) }))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Sprints</h1>
          {canEdit && (
            <Link
              href={`/sprints/nova?projetoId=${projetoId}`}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              + Nova Sprint
            </Link>
          )}
        </div>

        {sprintsWithMetrics.length === 0 ? (
          <EmptyState
            heading="Nenhuma sprint neste projeto"
            subtext="Crie a primeira sprint para começar a organizar o trabalho"
            size="md"
            action={canEdit ? { label: 'Criar sprint', href: `/sprints/nova?projetoId=${projetoId}` } : undefined}
          />
        ) : (
          <div className="space-y-3">
            {sprintsWithMetrics.map(({ sprint, metrics }) => {
              const sc = SPRINT_STATUS[sprint.status] ?? SPRINT_STATUS.PLANNED
              return (
                <div
                  key={sprint.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{sprint.name}</p>
                      {(sprint.startDate || sprint.endDate) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sprint.startDate && new Date(sprint.startDate).toLocaleDateString('pt-BR')}
                          {sprint.startDate && sprint.endDate && ' — '}
                          {sprint.endDate && new Date(sprint.endDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {metrics.cardsTotal > 0 && (
                        <ProgressBar value={metrics.cardsConcluidos} total={metrics.cardsTotal} />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        href={`/sprints/${sprint.id}`}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Abrir board
                      </Link>
                      {metrics.cardsTotal > 0 && (
                        <p className="text-xs text-gray-400">
                          {metrics.cardsConcluidos}/{metrics.cardsTotal} cards
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
