'use client'

import { useState, useActionState } from 'react'
import { updateProfileAction, type ProfileActionState } from '@/app/actions/profile'
import AvatarUpload from '@/components/profile/AvatarUpload'
import AddressFields, { type AddressValues } from '@/components/ui/AddressFields'
import Button from '@/components/ui/Button'

interface ProfileFormProps {
  name: string
  email: string
  cargo?: string | null
  departamento?: string | null
  hourlyRate: number
  phone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  notes?: string | null
  avatarUrl?: string | null
}

export default function ProfileForm({ name, email, cargo, departamento, hourlyRate, phone, cep, logradouro, numero, complemento, bairro, cidade, estado, notes, avatarUrl: initialAvatarUrl }: ProfileFormProps) {
  const [state, action, isPending] = useActionState(updateProfileAction, {} as ProfileActionState)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '')
  const [address, setAddress] = useState<AddressValues>({
    cep: cep ?? '',
    logradouro: logradouro ?? '',
    numero: numero ?? '',
    complemento: complemento ?? '',
    bairro: bairro ?? '',
    cidade: cidade ?? '',
    estado: estado ?? '',
  })

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

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ''}
          placeholder="(00) 00000-0000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Endereço — campos hidden sincronizados com AddressFields controlado */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">Endereço</p>
        {/* Inputs ocultos que carregam o estado para o FormData ao submeter */}
        {(Object.keys(address) as (keyof AddressValues)[]).map(field => (
          <input key={field} type="hidden" name={field} value={address[field]} />
        ))}
        <AddressFields
          values={address}
          onChange={(field, value) => setAddress(prev => ({ ...prev, [field]: value }))}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={notes ?? ''}
          rows={3}
          placeholder="Informações adicionais..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
