'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

  const hash = await bcrypt.hash(novaSenha, 12)
  await prisma.user.update({
    where: { id: session.userId as string },
    data: {
      passwordHash: hash,
      forcePasswordChange: false,
      tokenVersion: { increment: 1 },
    },
  })

  // Clear session so user logs in fresh with new password
  cookieStore.delete('session')
  redirect('/login?changed=1')
}
