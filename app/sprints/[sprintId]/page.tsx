import { getSprintBoardAction } from '@/app/actions/sprintBoard'
import SprintBoard from '@/components/sprint/SprintBoard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ sprintId: string }>
}

export default async function SprintPage({ params }: Props) {
  const { sprintId } = await params
  const result = await getSprintBoardAction(sprintId)

  if ('error' in result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{result.error}</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">Voltar ao board</Link>
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
    />
  )
}
