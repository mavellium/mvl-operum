'use client'

import { useState } from 'react'
import { adminUpdateUserAction, setUserRoleAction } from '@/app/actions/admin'
import type { AdminUser } from './AdminCreateUserModal'

interface Props {
  user: AdminUser
  onClose: () => void
  onUpdated: (user: AdminUser) => void
}

export default function AdminEditUserModal({ user, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: '',
    cargo: user.cargo ?? '',
    departamento: user.departamento ?? '',
    valorHora: user.valorHora?.toString() ?? '0',
    role: user.role,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nome e e-mail são obrigatórios.')
      return
    }
    setLoading(true)

    const updateResult = await adminUpdateUserAction(user.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password || undefined,
      cargo: form.cargo.trim() || undefined,
      departamento: form.departamento.trim() || undefined,
      valorHora: parseFloat(form.valorHora) || 0,
    })

    if ('error' in updateResult) {
      setLoading(false)
      setError(updateResult.error ?? 'Erro desconhecido')
      return
    }

    if (form.role !== user.role) {
      const roleResult = await setUserRoleAction(user.id, form.role)
      if ('error' in roleResult) {
        setLoading(false)
        setError(roleResult.error ?? 'Erro ao alterar role')
        return
      }
    }

    setLoading(false)
    onUpdated({ ...updateResult.user, role: form.role } as AdminUser)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Editar Usuário</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nome *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Field label="E-mail *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <Field label="Nova senha (deixe em branco para manter)" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          <Field label="Cargo" value={form.cargo} onChange={v => setForm(f => ({ ...f, cargo: v }))} />
          <Field label="Departamento" value={form.departamento} onChange={v => setForm(f => ({ ...f, departamento: v }))} />
          <Field label="Valor/hora (R$)" type="number" value={form.valorHora} onChange={v => setForm(f => ({ ...f, valorHora: v }))} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
