'use client'

import { useKanbanState } from '@/hooks/useKanbanState'
import BoardHeader from './BoardHeader'
import ColumnList from './ColumnList'
import { BoardState } from '@/types/kanban'

interface Sprint {
  id: string
  name: string
  status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
}

interface User {
  id: string
  name: string
  email: string
}

interface Tag {
  id: string
  name: string
  color: string
  boardId?: string
  userId?: string
}

interface KanbanBoardProps {
  initialState: BoardState
  boardId: string
  sprints?: Sprint[]
  tags?: Tag[]
  users?: User[]
  currentUser?: User | null
}

export default function KanbanBoard({ initialState, boardId, sprints, tags, users, currentUser }: KanbanBoardProps) {
  const { state, dispatch } = useKanbanState(initialState, boardId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col">
      <BoardHeader
        projectName={state.projectName}
        onRenameProject={name => dispatch({ type: 'RENAME_PROJECT', payload: { name } })}
        onAddColumn={title => dispatch({ type: 'ADD_COLUMN', payload: { title } })}
        currentUser={currentUser}
        boardId={boardId}
        sprints={sprints}
        tags={tags}
      />
      <main className="flex-1 overflow-x-auto px-4 py-4 pb-20">
        <ColumnList
          state={state}
          dispatch={dispatch}
          sprints={sprints}
          users={users}
          boardTags={tags}
          boardId={boardId}
        />
      </main>
    </div>
  )
}
