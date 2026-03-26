'use client'

import { useState } from 'react'
import InlineEdit from '@/components/ui/InlineEdit'
import Button from '@/components/ui/Button'
import AddColumnModal from './AddColumnModal'

interface BoardHeaderProps {
  projectName: string
  onRenameProject: (name: string) => void
  onAddColumn: (title: string) => void
}

export default function BoardHeader({ projectName, onRenameProject, onAddColumn }: BoardHeaderProps) {
  const [addColumnOpen, setAddColumnOpen] = useState(false)

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

        <Button variant="primary" onClick={() => setAddColumnOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Coluna
        </Button>
      </header>

      <AddColumnModal
        isOpen={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        onAdd={onAddColumn}
      />
    </>
  )
}
