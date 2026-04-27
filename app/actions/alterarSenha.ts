'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/session'
import { authApi } from '@/lib/api-client'

export async function alterarSenhaObrigatoriaAction(_prevState: unknown, formData: FormData) {
  const novaSenha = formData.get('novaSenha') as string
  const confirmacao = formData.get('confirmacao') as string

  if (!novaSenha || novaSenha.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres' }
  }
  if (novaSenha !== confirmacao) {
    return { error: 'Senhas não coincidem' }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await decrypt(token)

  if (!session?.userId) {
    redirect('/login')
  }

  try {
    await authApi.alterarSenha(novaSenha)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao alterar senha' }
  }

  cookieStore.delete('session')
  redirect('/login?changed=1')
}
