'use client'

import { useActionState } from 'react'
import { changePasswordAction, type ProfileActionState } from '@/app/actions/profile'
import Button from '@/components/ui/Button'

export default function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(changePasswordAction, {} as ProfileActionState)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="senhaAtual" className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
        <input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          id="novaSenha"
          name="novaSenha"
          type="password"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
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
        {isPending ? 'Alterando...' : 'Alterar senha'}
      </Button>
    </form>
  )
}
