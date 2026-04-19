'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { register, login, ConflictError, AuthError } from '@/services/authService'
import { getUserActiveProjects } from '@/services/projectService'
import { encrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { FormState } from '@/types/auth'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function signupAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' } })
    if (!tenant) return { message: 'Nenhum tenant disponível' }
    const user = await register({ name, email, password, tenantId: tenant.id })
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const token = await encrypt({ userId: user.id, role: user.role, tenantId: user.tenantId, tokenVersion: user.tokenVersion, expiresAt })
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

  let forcePasswordChange = false
  let projectRedirect = '/projetos'
  try {
    const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' } })
    if (!tenant) return { message: 'Nenhum tenant disponível' }
    const { userId, role, tenantId, tokenVersion, forcePasswordChange: fpc } = await login({ email, password, tenantId: tenant.id })
    forcePasswordChange = fpc
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const token = await encrypt({ userId, role, tenantId, tokenVersion, expiresAt })
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
    if (role !== 'admin') {
      const projects = await getUserActiveProjects(userId, tenantId)
      if (projects.length === 0) {
        projectRedirect = '/no-project'
      } else if (projects.length === 1) {
        projectRedirect = `/projetos/${projects[0].projectId}/dashboard`
      } else {
        projectRedirect = '/projetos'
      }
    }
  } catch (err) {
    console.error("🚨 ERRO GRAVE NO LOGIN:", err)
    
    if (err instanceof AuthError) {
      return { message: err.message }
    }
    return { message: 'Erro ao fazer login. Tente novamente.' }
  }

  if (forcePasswordChange) redirect('/alterar-senha')
  redirect(projectRedirect)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}

// ── Password Recovery ──────────────────────────────────────

function generateCode(length = 8): string {
  const { randomInt } = require('crypto') as typeof import('crypto')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('')
}

export async function requestPasswordResetAction(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()

  if (!email) {
    return { error: 'Email é obrigatório' }
  }

  // Always return success to avoid user enumeration
  try {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    })

    if (user) {
      const code = generateCode()
      const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 min
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: code, resetTokenExpiry: expiry },
      })
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[DEV] Reset code for ${email}: ${code}`)
      }
    }
  } catch {
    // Swallow to avoid leaking
  }

  return { success: true }
}

export async function validateResetCodeAction(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const code = (formData.get('code') as string)?.toUpperCase().trim()

  if (!email || !code) {
    return { error: 'Email e código são obrigatórios' }
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      resetToken: code,
      resetTokenExpiry: { gt: new Date() },
    },
  })

  if (!user) {
    return { error: 'Código inválido ou expirado' }
  }

  return { valid: true }
}

export async function resetPasswordAction(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const code = (formData.get('code') as string)?.toUpperCase().trim()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Senhas não coincidem' }
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      resetToken: code,
      resetTokenExpiry: { gt: new Date() },
    },
  })

  if (!user) {
    return { error: 'Código inválido ou expirado' }
  }

  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      resetToken: null,
      resetTokenExpiry: null,
      tokenVersion: { increment: 1 }, // invalidate all sessions
    },
  })

  return { success: true }
}
