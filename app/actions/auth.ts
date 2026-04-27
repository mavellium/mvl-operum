'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomInt } from 'crypto'
import Redis from 'ioredis'
import { encrypt } from '@/lib/session'
import { PasswordSchema } from '@/lib/validation/authSchemas'
import type { FormState } from '@/types/auth'
import {
  authServiceLogin,
  authServiceLogout,
  authServiceRegister,
  authServiceRequestReset,
  authServiceValidateCode,
  authServiceResetPassword,
} from '@/lib/authClient'
import { projectsApi } from '@/lib/api-client'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

let _rateLimitRedis: Redis | null = null

function getRateLimitRedis(): Redis | null {
  if (_rateLimitRedis) return _rateLimitRedis
  try {
    _rateLimitRedis = new Redis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
    _rateLimitRedis.on('error', () => {})
    return _rateLimitRedis
  } catch {
    return null
  }
}

async function redisRateLimit(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
  try {
    const redis = getRateLimitRedis()
    if (!redis) return false
    const attempts = await redis.incr(key)
    if (attempts === 1) await redis.expire(key, ttlSeconds)
    return attempts > limit
  } catch {
    return false // fail open — Redis unavailable
  }
}

export async function signupAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const tenantId = process.env.DEFAULT_TENANT_ID
  if (!tenantId) return { message: 'Cadastro indisponível — tenant não configurado' }

  try {
    const user = await authServiceRegister({ name, email, password, tenantId }) as { id: string; role: string; tenantId: string; tokenVersion: number }
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
    return { message: err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.' }
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
    const result = await authServiceLogin(email, password)
    forcePasswordChange = result.forcePasswordChange
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const cookieStore = await cookies()
    cookieStore.set('session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
    const { role, id: userId } = result.user
    if (role !== 'admin') {
      const projects = await projectsApi.getUserProjects(userId).catch(() => []) as unknown[]
      if (projects.length === 0) projectRedirect = '/no-project'
      else if (projects.length === 1) projectRedirect = `/projetos/${(projects[0] as { projectId?: string; id?: string }).projectId ?? (projects[0] as { id: string }).id}/dashboard`
    }
  } catch (err) {
    if (err instanceof Error) return { message: err.message }
    console.error('[loginAction] non-Error thrown:', err)
    return { message: 'Erro ao fazer login. Tente novamente.' }
  }

  if (forcePasswordChange) redirect('/alterar-senha')
  redirect(projectRedirect)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (token) await authServiceLogout(token)
  cookieStore.delete('session')
  redirect('/login')
}

// ── Password Recovery ──────────────────────────────────────

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('')
}

// generateCode is kept for potential future local use; currently all resets go via auth-service
void generateCode

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

  return authServiceRequestReset(email)
}

export async function validateResetCodeAction(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const code = (formData.get('code') as string)?.toUpperCase().trim()

  if (!email || !code) {
    return { error: 'Email e código são obrigatórios' }
  }

  try {
    return await authServiceValidateCode(email, code)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Código inválido ou expirado' }
  }
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

  try {
    return await authServiceResetPassword(email, code, newPassword)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Código inválido ou expirado' }
  }
}
