import { getSprintDashboardAction } from '@/app/actions/dashboard'
import SprintDashboard from '@/components/dashboard/SprintDashboard'
import Link from 'next/link'
import type { Metadata } from 'next'
import { sprintsApi } from '@/lib/api-client'
import { findById } from '@/services/projectService'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ sprintId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sprintId } = await params
  try {
    const sprint = (await sprintsApi.get(sprintId)) as { name?: string; projectId?: string }
    const projectId = sprint.projectId
    let projectName: string | undefined
    if (projectId) {
      const projeto = await findById(projectId)
      projectName = projeto?.name
    }
    return { title: projectName ? `Dashboard - ${sprint.name} - ${projectName}` : `Dashboard - ${sprint.name}` }
  } catch {
    return { title: 'Dashboard da Sprint' }
  }
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
