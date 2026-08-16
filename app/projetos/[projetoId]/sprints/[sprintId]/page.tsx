import { getSprintBoardAction } from '@/app/actions/sprintBoard'
import { getCurrentUserAction } from '@/app/actions/users'
import SprintBoard from '@/components/sprint/SprintBoard'
import Link from 'next/link'
import type { Metadata } from 'next'
import { sprintsApi } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ projetoId: string; sprintId: string }>
  searchParams: Promise<{ card?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sprintId } = await params
  try {
    const sprint = (await sprintsApi.get(sprintId)) as { name?: string }
    return { title: sprint.name ?? 'Sprint' }
  } catch {
    return { title: 'Sprint' }
  }
}

export default async function SprintPage({ params, searchParams }: Props) {
  const { projetoId, sprintId } = await params
  const { card: initialCardId } = await searchParams
  const [result, currentUser] = await Promise.all([
    getSprintBoardAction(sprintId, projetoId),
    getCurrentUserAction(),
  ])

  if ('error' in result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{result.error}</p>
        <Link href="/projetos" className="text-blue-600 hover:underline text-sm">Voltar aos projetos</Link>
      </div>
    )
  }

  return (
    <SprintBoard
      sprint={{
        ...result.sprint,
        status: result.sprint.status as 'PLANNED' | 'ACTIVE' | 'COMPLETED',
      }}
      columns={result.columns}
      backlogCards={result.backlogCards}
      projectId={projetoId}
      users={result.users}
      tags={result.tags}
      currentUser={currentUser}
      initialCardId={initialCardId}
    />
  )
}
