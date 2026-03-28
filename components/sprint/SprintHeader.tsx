'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { updateSprintMetaAction } from '@/app/actions/sprintBoard'
import { logoutAction } from '@/app/actions/auth'
import GlobalSearch from '@/components/search/GlobalSearch'
import BoardActionMenu from '@/components/board/BoardActionMenu'
import UserAvatar from '@/components/user/UserAvatar'
import Modal from '@/components/ui/Modal'
import { CsvImportModal } from '@/components/csv/CsvImportModal'
import { TagManager } from '@/components/tag/TagManager'

interface CurrentUser {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface Tag {
  id: string
  name: string
  color: string
}

interface SprintHeaderProps {
  sprint: {
    id: string
    name: string
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
    startDate: Date | string | null
    endDate: Date | string | null
    description?: string | null
    qualidade?: number | null
    dificuldade?: number | null
  }
  boardId?: string
  currentUser?: CurrentUser | null
  tags?: Tag[]
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

function formatDate(d: Date | string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function SprintHeader({ sprint, boardId, currentUser, tags = [] }: SprintHeaderProps) {
  const [qualidade, setQualidade] = useState(sprint.qualidade?.toString() ?? '')
  const [dificuldade, setDificuldade] = useState(sprint.dificuldade?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [sprintName, setSprintName] = useState(sprint.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editingName) nameInputRef.current?.select()
  }, [editingName])

  async function handleSaveName() {
    const trimmed = sprintName.trim()
    if (!trimmed || trimmed === sprint.name) {
      setSprintName(sprint.name)
      setEditingName(false)
      return
    }
    setSaving(true)
    await updateSprintMetaAction(sprint.id, { name: trimmed })
    setSaving(false)
    setEditingName(false)
  }

  async function handleSaveMeta() {
    setSaving(true)
    await updateSprintMetaAction(sprint.id, {
      qualidade: qualidade ? Number(qualidade) : undefined,
      dificuldade: dificuldade ? Number(dificuldade) : undefined,
    })
    setSaving(false)
  }

  return (
    <>
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/sprints" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0" aria-label="Voltar às sprints">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={sprintName}
                onChange={e => setSprintName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setSprintName(sprint.name); setEditingName(false) }
                }}
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-400 outline-none truncate min-w-0"
                aria-label="Nome da sprint"
              />
            ) : (
              <h1
                className="text-xl font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => setEditingName(true)}
                title="Clique para renomear"
              >
                {sprintName}
              </h1>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[sprint.status]}`}>
              {STATUS_LABELS[sprint.status]}
            </span>
            {(sprint.startDate || sprint.endDate) && (
              <div className="text-sm text-gray-500 hidden sm:block shrink-0">
                {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
              </div>
            )}
            <Link
              href={`/dashboard/sprint/${sprint.id}`}
              className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-lg transition-colors hidden md:block shrink-0"
            >
              Ver Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <GlobalSearch />

            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
                  aria-label="Menu do usuário"
                >
                  <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size="sm" />
                  <span className="text-sm text-gray-600 hidden sm:block">{currentUser.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                    <Link href="/perfil" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setUserMenuOpen(false)}>
                      Meu Perfil
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setUserMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <form action={logoutAction}>
                      <button type="submit" className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        Sair
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            <BoardActionMenu
              onImportCsv={() => setCsvOpen(true)}
              onCreateSprint={() => {}}
              onManageTags={() => setTagOpen(true)}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 px-6 py-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Qualidade (0–10):</label>
            <input type="number" min="0" max="10" step="0.1" value={qualidade} onChange={e => setQualidade(e.target.value)} onBlur={handleSaveMeta} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center text-gray-900 placeholder:text-gray-400" placeholder="—" aria-label="Qualidade da sprint" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Dificuldade (0–10):</label>
            <input type="number" min="0" max="10" step="0.1" value={dificuldade} onChange={e => setDificuldade(e.target.value)} onBlur={handleSaveMeta} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center text-gray-900 placeholder:text-gray-400" placeholder="—" aria-label="Dificuldade da sprint" />
          </div>
          {saving && <span className="text-xs text-gray-400">Salvando...</span>}
        </div>
      </header>

      {boardId && (
        <CsvImportModal isOpen={csvOpen} onClose={() => setCsvOpen(false)} boardId={boardId} />
      )}

      <Modal isOpen={tagOpen} onClose={() => setTagOpen(false)} title="Tags">
        <TagManager boardId={boardId ?? ''} tags={tags} />
      </Modal>
    </>
  )
}
