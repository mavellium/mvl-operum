import KanbanBoard from '@/components/board/KanbanBoard'
import { getOrCreateBoard } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { boardState, boardId } = await getOrCreateBoard()
  return <KanbanBoard initialState={boardState} boardId={boardId} />
}
