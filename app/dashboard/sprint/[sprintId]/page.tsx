import { getSprintDashboardAction } from '@/app/actions/dashboard'
import SprintDashboard from '@/components/dashboard/SprintDashboard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ sprintId: string }>
}

export default async function SprintDashboardPage({ params }: Props) {
  const { sprintId } = await params
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
      sprint={{
        ...result.sprint,
        status: result.sprint.status as string,
      }}
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
