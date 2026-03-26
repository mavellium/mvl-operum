'use client'

import { useKanbanState } from '@/hooks/useKanbanState'
import BoardHeader from './BoardHeader'
import ColumnList from './ColumnList'
import { BoardState } from '@/types/kanban'

interface KanbanBoardProps {
  initialState: BoardState
  boardId: string
}

export default function KanbanBoard({ initialState, boardId }: KanbanBoardProps) {
  const { state, dispatch } = useKanbanState(initialState, boardId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col">
      <BoardHeader
        projectName={state.projectName}
        onRenameProject={name => dispatch({ type: 'RENAME_PROJECT', payload: { name } })}
        onAddColumn={title => dispatch({ type: 'ADD_COLUMN', payload: { title } })}
      />
      <main className="flex-1 overflow-x-auto px-6 py-6">
        <ColumnList state={state} dispatch={dispatch} />
      </main>
    </div>
  )
}
