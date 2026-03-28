'use client'

import { useState, useEffect } from 'react'
import UserAvatar from '@/components/user/UserAvatar'
import { addResponsibleAction, removeResponsibleAction, getResponsiblesAction } from '@/app/actions/cardResponsible'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  cargo?: string | null
}

interface MultiUserSelectorProps {
  cardId: string
  users: User[]
}

interface Responsible {
  userId: string
  user: { id: string; name: string; cargo: string | null; avatarUrl: string | null }
}

export default function MultiUserSelector({ cardId, users }: MultiUserSelectorProps) {
  const [responsibles, setResponsibles] = useState<Responsible[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getResponsiblesAction(cardId).then(result => {
      if ('responsibles' in result && result.responsibles) setResponsibles(result.responsibles)
      setLoading(false)
    })
  }, [cardId])

  async function handleToggle(userId: string) {
    const isSelected = responsibles.some(r => r.userId === userId)
    if (isSelected) {
      await removeResponsibleAction(cardId, userId)
      setResponsibles(prev => prev.filter(r => r.userId !== userId))
    } else {
      const user = users.find(u => u.id === userId)
      if (!user) return
      await addResponsibleAction(cardId, userId)
      setResponsibles(prev => [...prev, {
        userId,
        user: { id: user.id, name: user.name, cargo: user.cargo ?? null, avatarUrl: user.avatarUrl ?? null },
      }])
    }
  }

  if (loading) return <div className="text-xs text-gray-400">Carregando...</div>

  return (
    <div className="space-y-2">
      {responsibles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {responsibles.map(r => (
            <div
              key={r.userId}
              className="flex items-center gap-1.5 bg-blue-50 rounded-full pl-1 pr-2 py-0.5"
            >
              <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} size="sm" />
              <span className="text-xs text-blue-800 font-medium">{r.user.name}</span>
              {r.user.cargo && <span className="text-xs text-blue-500">({r.user.cargo})</span>}
              <button
                onClick={() => handleToggle(r.userId)}
                className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                aria-label={`Remover ${r.user.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <select
        onChange={e => { if (e.target.value) { handleToggle(e.target.value); e.target.value = '' } }}
        defaultValue=""
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Adicionar responsável"
      >
        <option value="" disabled>Adicionar responsável...</option>
        {users
          .filter(u => !responsibles.some(r => r.userId === u.id))
          .map(u => (
            <option key={u.id} value={u.id}>{u.name}{u.cargo ? ` — ${u.cargo}` : ''}</option>
          ))}
      </select>
    </div>
  )
}
