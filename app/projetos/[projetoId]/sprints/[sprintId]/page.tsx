import { getSprintBoardAction } from '@/app/actions/sprintBoard'
import { getCurrentUserAction } from '@/app/actions/users'
import SprintBoard from '@/components/sprint/SprintBoard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ sprintId: string }>
  searchParams: Promise<{ card?: string }>
}

export default async function SprintPage({ params, searchParams }: Props) {
  const { sprintId } = await params
  const { card: initialCardId } = await searchParams
  const [result, currentUser] = await Promise.all([
    getSprintBoardAction(sprintId),
    getCurrentUserAction(),
  ])

  if ('error' in result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{result.error}</p>
        <Link href="/sprints" className="text-blue-600 hover:underline text-sm">Voltar às sprints</Link>
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
      users={result.users}
      tags={result.tags}
      currentUser={currentUser}
      initialCardId={initialCardId}
    />
  )
}
