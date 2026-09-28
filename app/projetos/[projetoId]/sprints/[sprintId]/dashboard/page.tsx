import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import SprintDashboardContent from '@/components/dashboard/SprintDashboardContent'
import { sprintsApi } from '@/lib/api-client'
import { sprintDashboardPath } from '@/lib/sprintPath'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ projetoId: string; sprintId: string }>
}

async function loadSprint(sprintId: string) {
  try {
    return (await sprintsApi.get(sprintId)) as { name?: string; projectId?: string | null }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sprintId } = await params
  const sprint = await loadSprint(sprintId)
  return { title: sprint?.name ? `Dashboard - ${sprint.name}` : 'Dashboard da Sprint' }
}

export default async function ProjetoSprintDashboardPage({ params }: Props) {
  const { projetoId, sprintId } = await params

  const sprint = await loadSprint(sprintId)
  if (!sprint) notFound()
  // URL com o projeto errado: manda para a do projeto dono da sprint.
  if (sprint.projectId && sprint.projectId !== projetoId) {
    redirect(sprintDashboardPath(sprintId, sprint.projectId))
  }

  return <SprintDashboardContent sprintId={sprintId} />
}
