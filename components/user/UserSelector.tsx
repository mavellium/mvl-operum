'use client'

interface User {
  id: string
  name: string
  email: string
}

interface UserSelectorProps {
  users: User[]
  value: string | null
  onChange: (userId: string | null) => void
  label?: string
}

export default function UserSelector({ users, value, onChange, label }: UserSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
      >
        <option value="">— Nenhum responsável —</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  )
}
