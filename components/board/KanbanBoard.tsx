'use client'

import { useState, useMemo } from 'react'
import { useKanbanState } from '@/hooks/useKanbanState'
import BoardHeader from './BoardHeader'
import ColumnList from './ColumnList'
import SprintFilterBar from './SprintFilterBar'
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
  const [filterSprintId, setFilterSprintId] = useState<string | null>(null)

  const visibleCardIds = useMemo<string[] | null>(() => {
    if (!filterSprintId) return null
    return Object.keys(state.cards).filter(id => state.cards[id].sprintId === filterSprintId)
  }, [state.cards, filterSprintId])

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
      {sprints && sprints.length > 0 && (
        <SprintFilterBar
          sprints={sprints}
          activeSprintId={filterSprintId}
          onFilterChange={setFilterSprintId}
        />
      )}
      <main className="flex-1 overflow-x-auto px-6 py-6">
        <ColumnList
          state={state}
          dispatch={dispatch}
          visibleCardIds={visibleCardIds}
          sprints={sprints}
          users={users}
          boardTags={tags}
          boardId={boardId}
        />
      </main>
    </div>
  )
}
