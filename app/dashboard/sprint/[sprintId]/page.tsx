import { redirect } from 'next/navigation'
import SprintDashboardContent from '@/components/dashboard/SprintDashboardContent'
import { sprintDashboardPath } from '@/lib/sprintPath'
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

  // Rota legada: fora de /projetos/:id o AppShell mostra o menu global (do
  // admin). Se a sprint é de um projeto, vai para a rota canônica.
  // O redirect() fica FORA do try: ele lança NEXT_REDIRECT, que o catch engoliria.
  let projectId: string | undefined
  try {
    const sprint = (await sprintsApi.get(sprintId)) as { projectId?: string }
    projectId = sprint.projectId
  } catch {
    // segue o fluxo: o dashboard resolve e reporta o erro
  }
  if (projectId) redirect(sprintDashboardPath(sprintId, projectId))

  return <SprintDashboardContent sprintId={sprintId} />
}
