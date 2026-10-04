import Link from 'next/link'
import { getSprintDashboardAction } from '@/app/actions/dashboard'
import SprintDashboard from '@/components/dashboard/SprintDashboard'

/** Carrega e renderiza o dashboard de uma sprint (usado pela rota do projeto e pela legada). */
export default async function SprintDashboardContent({ sprintId }: { sprintId: string }) {
  const result = await getSprintDashboardAction(sprintId)

  if ('error' in result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{result.error}</p>
        <Link href="/projetos" className="text-blue-600 hover:underline text-sm">Voltar aos projetos</Link>
      </div>
    )
  }

  return (
    <SprintDashboard
      sprint={result.sprint}
      metrics={result.metrics}
      userMetrics={result.userMetrics}
      cardsByColumn={result.cardsByColumn}
      overdueCards={result.overdueCards}
      feedbacks={result.feedbacks}
      avgQualidade={result.avgQualidade}
      avgDificuldade={result.avgDificuldade}
    />
  )
}
