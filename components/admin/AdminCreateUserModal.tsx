'use client'

import { useState } from 'react'
import { adminCreateUserAction } from '@/app/actions/admin'

interface Props {
  onClose: () => void
  onCreated: (user: AdminUser) => void
}

export interface AdminUser {
  id: string
  name: string
  email: string
  cargo: string | null
  departamento: string | null
  hourlyRate: number
  role: string
  isActive: boolean
  avatarUrl: string | null
}

export default function AdminCreateUserModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    isAdmin: false,
    forcePasswordChange: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Nome, e-mail e senha são obrigatórios.')
      return
    }
    setLoading(true)
    const result = await adminCreateUserAction({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      isAdmin: form.isAdmin,
      forcePasswordChange: form.forcePasswordChange,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error ?? 'Erro desconhecido')
      return
    }
    onCreated(result.user as AdminUser)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Novo Usuário</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senha *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.isAdmin}
                onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Administrador global
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.forcePasswordChange}
                onChange={e => setForm(f => ({ ...f, forcePasswordChange: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Obrigar troca de senha no próximo login
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Criando…' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
