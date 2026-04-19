'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, randomInt } from 'crypto'
import { register, login, ConflictError, AuthError } from '@/services/authService'
import { getUserActiveProjects } from '@/services/projectService'
import { encrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { PasswordSchema } from '@/lib/validation/authSchemas'
import type { FormState } from '@/types/auth'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function hashResetToken(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

async function redisRateLimit(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
  try {
    const { Redis } = await import('ioredis')
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    })
    await redis.connect()
    const attempts = await redis.incr(key)
    if (attempts === 1) await redis.expire(key, ttlSeconds)
    await redis.quit()
    return attempts > limit
  } catch {
    return false // fail open — Redis unavailable
  }
}

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

  // Rate limit: max 10 login attempts per IP per 15 minutes.
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rateLimited = await redisRateLimit(`login_rate:${ip}`, 10, 900)
  if (rateLimited) {
    return { message: 'Muitas tentativas de login. Aguarde 15 minutos.' }
  }

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('')
}

export async function requestPasswordResetAction(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()

  if (!email) {
    return { error: 'Email é obrigatório' }
  }

  // Rate limit: max 3 requests per email per 15 minutes.
  const rateLimited = await redisRateLimit(`reset_rate:${email}`, 3, 900)
  if (rateLimited) {
    return { error: 'Muitas tentativas. Aguarde 15 minutos.' }
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
        data: { resetToken: hashResetToken(code), resetTokenExpiry: expiry },
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
      resetToken: hashResetToken(code),
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

  const passwordValidation = PasswordSchema.safeParse(newPassword)
  if (!passwordValidation.success) {
    return { error: passwordValidation.error.issues[0].message }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Senhas não coincidem' }
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      resetToken: hashResetToken(code),
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
