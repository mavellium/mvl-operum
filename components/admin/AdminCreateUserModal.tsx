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
  valorHora: number
  role: string
  isActive: boolean
  avatarUrl: string | null
}

export default function AdminCreateUserModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    cargo: '',
    departamento: '',
    valorHora: '',
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
      cargo: form.cargo.trim() || undefined,
      departamento: form.departamento.trim() || undefined,
      valorHora: form.valorHora ? parseFloat(form.valorHora) : undefined,
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
          <Field label="Nome *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Field label="E-mail *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <Field label="Senha *" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          <Field label="Cargo" value={form.cargo} onChange={v => setForm(f => ({ ...f, cargo: v }))} />
          <Field label="Departamento" value={form.departamento} onChange={v => setForm(f => ({ ...f, departamento: v }))} />
          <Field label="Valor/hora (R$)" type="number" value={form.valorHora} onChange={v => setForm(f => ({ ...f, valorHora: v }))} />
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
