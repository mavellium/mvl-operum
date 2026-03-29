'use client'

import { useState } from 'react'
import UserAvatar from '@/components/user/UserAvatar'
import AdminCreateUserModal, { type AdminUser } from './AdminCreateUserModal'
import AdminEditUserModal from './AdminEditUserModal'
import { toggleUserActiveAction } from '@/app/actions/admin'

interface Props {
  initialUsers: AdminUser[]
}

export default function AdminUsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  function handleCreated(user: AdminUser) {
    setUsers(prev => [...prev, user])
    setShowCreate(false)
  }

  function handleUpdated(user: AdminUser) {
    setUsers(prev => prev.map(u => (u.id === user.id ? user : u)))
    setEditUser(null)
  }

  async function handleToggleActive(user: AdminUser) {
    setLoading(user.id + '-active')
    const result = await toggleUserActiveAction(user.id, !user.isActive)
    setLoading(null)
    if ('error' in result) return
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
        >
          + Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Usuário</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Cargo / Depto</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">R$/h</th>
              <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Role</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900 leading-tight">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-gray-700">{user.cargo ?? '—'}</p>
                  {user.departamento && <p className="text-xs text-gray-400">{user.departamento}</p>}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">
                  {user.valorHora > 0 ? `R$ ${user.valorHora.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role === 'admin' ? 'Admin' : 'Membro'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditUser(user)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={loading === user.id + '-active'}
                      className={`px-2.5 py-1 text-xs rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-50 ${user.isActive ? 'border-gray-200' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                    >
                      {user.isActive ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <AdminCreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editUser && (
        <AdminEditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={handleUpdated} />
      )}
    </>
  )
}
