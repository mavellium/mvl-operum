'use client'

import { useState, useActionState } from 'react'
import { updateProfileAction, type ProfileActionState } from '@/app/actions/profile'
import AvatarUpload from '@/components/profile/AvatarUpload'
import Button from '@/components/ui/Button'

interface ProfileFormProps {
  name: string
  email: string
  cargo?: string | null
  departamento?: string | null
  hourlyRate: number
  phone?: string | null
  address?: string | null
  notes?: string | null
  avatarUrl?: string | null
}

export default function ProfileForm({ name, email, cargo, departamento, hourlyRate, phone, address, notes, avatarUrl: initialAvatarUrl }: ProfileFormProps) {
  const [state, action, isPending] = useActionState(updateProfileAction, {} as ProfileActionState)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '')

  return (
    <form action={action} className="space-y-4">
      {/* Avatar — onChange atualiza o estado local; é enviado no submit via hidden input */}
      <div className="flex justify-center pb-2">
        <AvatarUpload name={name} avatarUrl={avatarUrl} onChange={setAvatarUrl} />
      </div>
      <input type="hidden" name="avatarUrl" value={avatarUrl} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <input
            id="cargo"
            name="cargo"
            defaultValue={cargo ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
          <input
            id="departamento"
            name="departamento"
            defaultValue={departamento ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">Valor/hora (R$)</label>
        <input
          id="hourlyRate"
          name="hourlyRate"
          type="number"
          min="0"
          step="0.01"
          defaultValue={hourlyRate}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {'error' in state && state.error && (
        <p className="text-sm text-red-600">{state.error as string}</p>
      )}
      {'message' in state && state.message && (
        <p className="text-sm text-green-600">{state.message as string}</p>
      )}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
