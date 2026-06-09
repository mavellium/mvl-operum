'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  createTenantAction,
  updateTenantStatusAction,
  updateTenantNameAction,
  joinTenantAction,
} from '@/app/actions/admin'

type Tenant = {
  id: string
  name: string
  subdomain: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REMOVED'
  createdAt: Date
  _count: { users: number; projects: number }
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  REMOVED: 'bg-red-100 text-red-600',
}

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
  REMOVED: 'Removido',
}

function InlineNameEdit({
  id, currentName, onSave, onCancel, disabled,
}: {
  id: string; currentName: string; onSave: (id: string, name: string) => void
  onCancel: () => void; disabled: boolean
}) {
  const [value, setValue] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(id, value); if (e.key === 'Escape') onCancel() }}
        disabled={disabled}
        className="flex-1 px-2 py-1 text-sm font-semibold text-gray-900 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white min-w-0"
      />
      <button onClick={() => onSave(id, value)} disabled={disabled || !value.trim()} title="Salvar"
        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button onClick={onCancel} title="Cancelar"
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function JoinForm({
  tenantId, tenantName, onSuccess, onCancel,
}: {
  tenantId: string; tenantName: string; onSuccess: (tenantId: string) => void; onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit() {
    setError('')
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    startTransition(async () => {
      const result = await joinTenantAction(tenantId, password)
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        onSuccess(tenantId)
      }
    })
  }

  return (
    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
      <p className="text-xs text-indigo-800 font-medium">
        Defina uma senha para sua conta em <strong>{tenantName}</strong>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Nova senha"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Confirmar senha"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Registrando…' : 'Confirmar acesso'}
        </button>
      </div>
    </div>
  )
}

export default function AdminTenantsClient({
  initialTenants,
  myTenantIds,
}: {
  initialTenants: Tenant[]
  myTenantIds: string[]
}) {
  const [tenants, setTenants] = useState(initialTenants)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(myTenantIds))
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubdomainInput(value: string) {
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  function handleCreate() {
    setFormError('')
    if (!name.trim() || !subdomain.trim()) { setFormError('Preencha nome e subdomínio.'); return }
    startTransition(async () => {
      const result = await createTenantAction({ name: name.trim(), subdomain: subdomain.trim() })
      if ('error' in result) {
        setFormError(result.error ?? 'Erro desconhecido')
      } else {
        setTenants(prev => [{ ...(result.tenant as unknown as Tenant), _count: { users: 0, projects: 0 } }, ...prev])
        setName('')
        setSubdomain('')
        setShowForm(false)
      }
    })
  }

  function handleStatusChange(id: string, status: Tenant['status']) {
    startTransition(async () => {
      const result = await updateTenantStatusAction(id, status)
      if (!('error' in result)) setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    })
  }

  function handleNameSave(id: string, newName: string) {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await updateTenantNameAction(id, newName)
      if (!('error' in result)) setTenants(prev => prev.map(t => t.id === id ? { ...t, name: newName.trim() } : t))
      setEditingId(null)
    })
  }

  function handleJoinSuccess(tenantId: string) {
    setJoinedIds(prev => new Set([...prev, tenantId]))
    setJoiningId(null)
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{tenants.length} workspace{tenants.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setShowForm(v => !v); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo workspace
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-blue-900">Novo workspace</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subdomínio</label>
              <div className="flex items-center">
                <input type="text" value={subdomain} onChange={e => handleSubdomainInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="acme"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <span className="px-3 py-2 text-xs text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg whitespace-nowrap">.operum.com</span>
              </div>
            </div>
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setFormError('') }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
              {isPending ? 'Criando…' : 'Criar workspace'}
            </button>
          </div>
        </div>
      )}

      {/* Tenants list */}
      {tenants.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum workspace cadastrado.</div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => {
            const hasAccess = joinedIds.has(t.id)
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === t.id ? (
                      <InlineNameEdit id={t.id} currentName={t.name}
                        onSave={handleNameSave} onCancel={() => setEditingId(null)} disabled={isPending} />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap group">
                        <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${statusBadge[t.status]}`}>
                          {statusLabel[t.status]}
                        </span>
                        {hasAccess && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700">
                            com acesso
                          </span>
                        )}
                        <button onClick={() => setEditingId(t.id)} title="Editar nome"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.subdomain}.operum.com · {t._count.users} usuário{t._count.users !== 1 ? 's' : ''} · {t._count.projects} projeto{t._count.projects !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!hasAccess && joiningId !== t.id && (
                      <button
                        onClick={() => setJoiningId(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Entrar
                      </button>
                    )}

                    <select
                      value={t.status}
                      disabled={isPending || editingId === t.id}
                      onChange={e => handleStatusChange(t.id, e.target.value as Tenant['status'])}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                      <option value="SUSPENDED">Suspenso</option>
                      <option value="REMOVED">Removido</option>
                    </select>
                  </div>
                </div>

                {/* Join form — expands inline */}
                {joiningId === t.id && (
                  <JoinForm
                    tenantId={t.id}
                    tenantName={t.name}
                    onSuccess={handleJoinSuccess}
                    onCancel={() => setJoiningId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
