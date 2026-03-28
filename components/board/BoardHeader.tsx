'use client'

import { useState } from 'react'
import InlineEdit from '@/components/ui/InlineEdit'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import AddColumnModal from './AddColumnModal'
import BoardActionMenu from './BoardActionMenu'
import UserAvatar from '@/components/user/UserAvatar'
import { CsvImportModal } from '@/components/csv/CsvImportModal'
import { SprintManager } from '@/components/sprint/SprintManager'
import { TagManager } from '@/components/tag/TagManager'
import { logoutAction } from '@/app/actions/auth'

interface User {
  id: string
  name: string
  email: string
}

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  boardId: string
  startDate: Date | null
  endDate: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface Tag {
  id: string
  name: string
  color: string
  boardId: string
  userId: string
}

interface BoardHeaderProps {
  projectName: string
  onRenameProject: (name: string) => void
  onAddColumn: (title: string) => void
  currentUser?: User | null
  boardId?: string
  sprints?: { id: string; name: string; status?: string }[]
  tags?: { id: string; name: string; color: string; boardId?: string; userId?: string }[]
}

export default function BoardHeader({
  projectName,
  onRenameProject,
  onAddColumn,
  currentUser,
  boardId,
  sprints,
  tags,
}: BoardHeaderProps) {
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [sprintOpen, setSprintOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)

  const normalizedSprints: Sprint[] = (sprints ?? []).map(s => ({
    id: s.id,
    name: s.name,
    status: (s.status ?? 'PLANNED') as 'PLANNED' | 'ACTIVE' | 'COMPLETED',
    boardId: boardId ?? '',
    startDate: null,
    endDate: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  const normalizedTags: Tag[] = (tags ?? []).map(t => ({
    id: t.id,
    name: t.name,
    color: t.color,
    boardId: t.boardId ?? boardId ?? '',
    userId: t.userId ?? '',
  }))

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <InlineEdit
            value={projectName}
            onSave={onRenameProject}
            className="text-xl font-bold text-gray-900"
            inputClassName="text-xl font-bold text-gray-900 w-64"
            placeholder="Nome do projeto"
          />
          <span className="text-xs text-gray-400 hidden sm:block">(clique para editar)</span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <>
              <UserAvatar name={currentUser.name} size="sm" />
              <span className="text-sm text-gray-600 hidden sm:block">{currentUser.name}</span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded transition-colors"
                >
                  Sair
                </button>
              </form>
            </>
          )}

          <Button variant="primary" onClick={() => setAddColumnOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Coluna
          </Button>

          <BoardActionMenu
            onImportCsv={() => setCsvOpen(true)}
            onCreateSprint={() => setSprintOpen(true)}
            onManageTags={() => setTagOpen(true)}
          />
        </div>
      </header>

      <AddColumnModal
        isOpen={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        onAdd={onAddColumn}
      />

      {boardId && (
        <CsvImportModal
          isOpen={csvOpen}
          onClose={() => setCsvOpen(false)}
          boardId={boardId}
        />
      )}

      {boardId && (
        <Modal isOpen={sprintOpen} onClose={() => setSprintOpen(false)} title="Sprints">
          <SprintManager boardId={boardId} sprints={normalizedSprints} />
        </Modal>
      )}

      {boardId && (
        <Modal isOpen={tagOpen} onClose={() => setTagOpen(false)} title="Tags">
          <TagManager boardId={boardId} tags={normalizedTags} />
        </Modal>
      )}
    </>
  )
}
