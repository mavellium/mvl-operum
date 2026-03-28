'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { register, login, ConflictError, AuthError } from '@/services/authService'
import { encrypt } from '@/lib/session'
import type { FormState } from '@/types/auth'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function signupAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const user = await register({ name, email, password })
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const token = await encrypt({ userId: user.id, role: user.role, expiresAt })
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
  } catch (err) {
    if (err instanceof ConflictError) {
      return { message: err.message }
    }
    return { message: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/')
}

export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const { userId, role } = await login({ email, password })
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const token = await encrypt({ userId, role, expiresAt })
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return { message: err.message }
    }
    return { message: 'Erro ao fazer login. Tente novamente.' }
  }

  redirect('/')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}
