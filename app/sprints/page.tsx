import { getOrCreateBoard } from '@/app/actions'
import { getSprintsForBoardAction } from '@/app/actions/sprints'
import SprintListPage from '@/components/sprint/SprintListPage'

export const dynamic = 'force-dynamic'

export default async function SprintsPage() {
  const { boardId } = await getOrCreateBoard()
  const sprints = await getSprintsForBoardAction(boardId)

  return (
    <SprintListPage
      sprints={(sprints ?? []).map(s => ({
        ...s,
        status: s.status as 'PLANNED' | 'ACTIVE' | 'COMPLETED',
      }))}
      boardId={boardId}
    />
  )
}
