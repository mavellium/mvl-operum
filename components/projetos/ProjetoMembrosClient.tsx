'use client'

import { useState, useTransition } from 'react'
import { addMemberAction, removeMemberAction, updateUsuarioProjetoAction } from '@/app/actions/projetos'
import UserAvatar from '@/components/user/UserAvatar'

interface Usuario {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

interface Membro extends Usuario {
  userId: string
  cargo: string | null
  departamento: string | null
  valorHora: number | null
  dataEntrada: string
}

interface Props {
  projetoId: string
  membros: Membro[]
  disponiveis: Usuario[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  member: 'Membro',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  gerente: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
}

export default function ProjetoMembrosClient({ projetoId, membros: initial, disponiveis: initialDisp }: Props) {
  const [membros, setMembros] = useState(initial)
  const [disponiveis, setDisponiveis] = useState(initialDisp)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ cargo: '', departamento: '', valorHora: '' })

  const filteredDisp = disponiveis.filter(u => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function handleStartEdit(m: Membro) {
    setEditingId(m.userId)
    setEditForm({
      cargo: m.cargo ?? '',
      departamento: m.departamento ?? '',
      valorHora: m.valorHora?.toString() ?? '',
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
  }

  function handleSaveEdit(m: Membro) {
    setLoadingId(m.userId)
    startTransition(async () => {
      const result = await updateUsuarioProjetoAction(m.userId, projetoId, {
        cargo: editForm.cargo,
        departamento: editForm.departamento,
        valorHora: editForm.valorHora ? parseFloat(editForm.valorHora) : null,
      })
      setLoadingId(null)
      if (!('error' in result)) {
        setMembros(prev => prev.map(existing =>
          existing.userId === m.userId
            ? {
                ...existing,
                cargo: editForm.cargo || null,
                departamento: editForm.departamento || null,
                valorHora: editForm.valorHora ? parseFloat(editForm.valorHora) : null,
              }
            : existing,
        ))
        setEditingId(null)
      }
    })
  }

  function handleAdd(user: Usuario) {
    setLoadingId(user.id)
    startTransition(async () => {
      const result = await addMemberAction(projetoId, user.id)
      setLoadingId(null)
      if ('error' in result) return
      const novoMembro: Membro = {
        ...user,
        userId: user.id,
        cargo: null,
        departamento: null,
        valorHora: null,
        dataEntrada: new Date().toISOString(),
      }
      setMembros(prev => [...prev, novoMembro])
      setDisponiveis(prev => prev.filter(u => u.id !== user.id))
      setSearch('')
    })
  }

  function handleRemove(membro: Membro) {
    setLoadingId(membro.userId)
    startTransition(async () => {
      const result = await removeMemberAction(projetoId, membro.userId)
      setLoadingId(null)
      if ('error' in result) return
      setMembros(prev => prev.filter(m => m.userId !== membro.userId))
      setDisponiveis(prev => [...prev, { id: membro.userId, name: membro.name, email: membro.email, avatarUrl: membro.avatarUrl, role: membro.role }])
    })
  }

  return (
    <div className="space-y-4">
      {/* Current members */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">{membros.length} membro{membros.length !== 1 ? 's' : ''}</h2>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            + Adicionar membro
          </button>
        </div>

        {membros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum membro ainda</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {membros.map(m => (
              <div key={m.userId}>
                {/* Member row */}
                <div className="px-4 py-3 flex items-start gap-3">
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900">{m.name}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{m.email}</p>
                    {(m.cargo || m.departamento || m.valorHora) && editingId !== m.userId && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {m.cargo && <span className="text-xs text-gray-600">{m.cargo}</span>}
                        {m.departamento && <span className="text-xs text-gray-400">{m.departamento}</span>}
                        {m.valorHora != null && <span className="text-xs text-gray-400">R$ {m.valorHora.toFixed(2)}/h</span>}
                      </div>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">
                      Entrou em {new Date(m.dataEntrada).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId !== m.userId && (
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(m)}
                      disabled={loadingId === m.userId || isPending}
                      className="px-2.5 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      {loadingId === m.userId ? '…' : 'Remover'}
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === m.userId && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 pt-3 mb-2">Dados no projeto</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cargo</label>
                        <input
                          type="text"
                          value={editForm.cargo}
                          onChange={e => setEditForm(f => ({ ...f, cargo: e.target.value }))}
                          placeholder="Ex: Dev Backend"
                          autoFocus
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Departamento</label>
                        <input
                          type="text"
                          value={editForm.departamento}
                          onChange={e => setEditForm(f => ({ ...f, departamento: e.target.value }))}
                          placeholder="Ex: Tecnologia"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Valor/hora (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.valorHora}
                          onChange={e => setEditForm(f => ({ ...f, valorHora: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(m)}
                        disabled={loadingId === m.userId || isPending}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loadingId === m.userId ? '…' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member panel */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Adicionar ao projeto</h2>
            <input
              type="search"
              placeholder="Buscar por nome ou email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {filteredDisp.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              {disponiveis.length === 0 ? 'Todos os usuários já são membros' : 'Nenhum resultado'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {filteredDisp.map(u => (
                <li key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(u)}
                    disabled={loadingId === u.id || isPending}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                  >
                    {loadingId === u.id ? '…' : 'Adicionar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
