'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Redis from 'ioredis'
import { encrypt } from '@/lib/session'
import {
  RequestResetSchema,
  ValidateCodeSchema,
  ResetPasswordSchema,
} from '@/lib/validation/authSchemas'
import type { FormState } from '@/types/auth'
import {
  authServiceLogin,
  authServiceLogout,
  authServiceRegister,
  authServiceRequestReset,
  authServiceValidateCode,
  authServiceResetPassword,
} from '@/lib/authClient'
import { projectsApi, authApi } from '@/lib/api-client'
import { verifySession, resolveProjectDestination } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

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

  const subdomain = await getSubdomain()

  try {
    const result = await authServiceLogin(email, password, subdomain)
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

/** Extrai o subdomínio do host da request (nunca do cliente). */
async function getSubdomain(): Promise<string | undefined> {
  try {
    const headerStore = await headers()
    const host = (headerStore.get('host') ?? '').split(':')[0] // remove a porta (ex.: "localhost:3000")
    const sub = host.split('.')[0]
    return sub && sub !== 'www' && sub !== 'localhost' && !/^\d/.test(sub) ? sub : undefined
  } catch {
    return undefined
  }
}

export async function requestPasswordResetAction(_prevState: unknown, formData: FormData) {
  const raw = { email: (formData.get('email') as string | null)?.toLowerCase().trim() ?? '' }
  const parsed = RequestResetSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email } = parsed.data

  // Rate limit front-end: 3 solicitações por e-mail por 15 min (defense-in-depth)
  const rateLimited = await redisRateLimit(`reset_rate:${email}`, 3, 900)
  if (rateLimited) {
    return { error: 'Muitas tentativas. Aguarde 15 minutos.' }
  }

  const subdomain = await getSubdomain()
  // Sempre retorna sucesso — anti-enumeração
  return authServiceRequestReset(email, subdomain)
}

export async function validateResetCodeAction(_prevState: unknown, formData: FormData) {
  const raw = {
    email: (formData.get('email') as string | null)?.toLowerCase().trim() ?? '',
    code: (formData.get('code') as string | null)?.toUpperCase().trim() ?? '',
  }
  const parsed = ValidateCodeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const subdomain = await getSubdomain()
  try {
    return await authServiceValidateCode(parsed.data.email, parsed.data.code, subdomain)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Código inválido ou expirado.' }
  }
}

export async function resetPasswordAction(_prevState: unknown, formData: FormData) {
  const newPassword = (formData.get('newPassword') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (newPassword !== confirmPassword) {
    return { error: 'Senhas não coincidem.' }
  }

  const raw = {
    email: (formData.get('email') as string | null)?.toLowerCase().trim() ?? '',
    code: (formData.get('code') as string | null)?.toUpperCase().trim() ?? '',
    newPassword,
  }
  const parsed = ResetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const subdomain = await getSubdomain()
  try {
    return await authServiceResetPassword(
      parsed.data.email,
      parsed.data.code,
      parsed.data.newPassword,
      subdomain,
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Código inválido ou expirado.' }
  }
}

export async function getMyTenantsAction() {
  await verifySession() // redirects to /login if not authenticated
  try {
    return await authApi.getMyTenants()
  } catch {
    return []
  }
}

// CUID v1/v2 format — prevents arbitrary string injection downstream
const CUID_RE = /^c[a-z0-9]{20,}$/i

export async function switchTenantAction(targetTenantId: string) {
  if (!targetTenantId?.trim() || !CUID_RE.test(targetTenantId)) return

  const { token: oldToken } = await verifySession()

  // Verify the user actually has a membership in the target tenant before switching.
  // This is a client-side guard; auth-service enforces the same check server-side.
  const myTenants = await authApi.getMyTenants().catch(() => [])
  const isMember = myTenants.some(t => t.tenantId === targetTenantId)
  if (!isMember) return

  const result = await authApi.switchTenant(targetTenantId)

  // Invalidate old session only after the new one is issued, to avoid a race
  // where the gateway rejects the switch call as "Sessão expirada".
  authServiceLogout(oldToken).catch((err: unknown) => {
    console.warn('[switchTenantAction] failed to invalidate old session:', err instanceof Error ? err.message : err)
  })

  const cookieStore = await cookies()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  cookieStore.set('session', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  })

  revalidatePath('/', 'layout')
  redirect('/projetos')
}

/**
 * Usado pelo botão "Verificar novamente" em /no-project. Reaplica a mesma
 * regra de destino da Home (consulta o banco a cada chamada) e redireciona
 * automaticamente se o usuário já tiver acesso. Se ainda não tiver, retorna
 * sem redirecionar — o cliente mostra um aviso discreto.
 */
export async function checkProjectAccessAction(): Promise<{ hasAccess: false }> {
  const destination = await resolveProjectDestination()
  if (destination) redirect(destination)
  return { hasAccess: false }
}
