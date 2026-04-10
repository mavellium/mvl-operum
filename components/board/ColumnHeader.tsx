'use client'

import { useState } from 'react'
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import InlineEdit from '@/components/ui/InlineEdit'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface ColumnHeaderProps {
  title: string
  cardCount: number
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  onRename: (title: string) => void
  onDelete: () => void
}

export default function ColumnHeader({ title, cardCount, dragHandleProps, onRename, onDelete }: ColumnHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div
        {...dragHandleProps}
        className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing border-b border-black/5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <InlineEdit
            value={title}
            onSave={onRename}
            className="font-bold text-gray-800 text-sm tracking-tight truncate hover:text-blue-600 transition-colors"
            inputClassName="font-bold text-gray-800 text-sm w-40 bg-white/50 rounded px-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="bg-gray-200/50 backdrop-blur-sm text-gray-600 text-[10px] font-bold rounded-md px-1.5 py-0.5 min-w-[20px] text-center shadow-sm border border-black/5 shrink-0">
            {cardCount}
          </span>
        </div>
        
        <button
          onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
          aria-label={`Excluir coluna ${title}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onDelete}
        title="Excluir coluna"
        message={`Tem certeza que deseja excluir a coluna "${title}"? Todos os cards desta coluna serão removidos.`}
      />
    </>
  )
}