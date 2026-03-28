import KanbanBoard from '@/components/board/KanbanBoard'
import { getOrCreateBoard } from '@/app/actions'
import { getSprintsForBoardAction } from '@/app/actions/sprints'
import { getTagsForBoardAction } from '@/app/actions/tags'
import { getUsersAction, getCurrentUserAction } from '@/app/actions/users'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { boardState, boardId } = await getOrCreateBoard()

  const [sprints, tagsResult, users, currentUser] = await Promise.all([
    getSprintsForBoardAction(boardId),
    getTagsForBoardAction(boardId),
    getUsersAction(),
    getCurrentUserAction(),
  ])

  const tags = tagsResult && 'tags' in tagsResult ? tagsResult.tags : []

  return (
    <KanbanBoard
      initialState={boardState}
      boardId={boardId}
      sprints={sprints ?? []}
      tags={tags}
      users={users}
      currentUser={currentUser}
    />
  )
}
