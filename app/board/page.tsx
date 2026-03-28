import KanbanBoard from '@/components/board/KanbanBoard'
import { getOrCreateBoard } from '@/app/actions'
import { getTagsForBoardAction } from '@/app/actions/tags'
import { getUsersAction, getCurrentUserAction } from '@/app/actions/users'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const { boardState, boardId } = await getOrCreateBoard()

  const [tagsResult, users, currentUser] = await Promise.all([
    getTagsForBoardAction(boardId),
    getUsersAction(),
    getCurrentUserAction(),
  ])

  const tags = tagsResult && 'tags' in tagsResult ? tagsResult.tags : []

  return (
    <KanbanBoard
      initialState={boardState}
      boardId={boardId}
      sprints={[]}
      tags={tags}
      users={users}
      currentUser={currentUser}
    />
  )
}
