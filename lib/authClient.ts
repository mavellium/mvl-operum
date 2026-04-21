/**
 * HTTP client for auth-service.
 * Used by Server Actions when AUTH_SERVICE_URL is defined.
 */

const AUTH_URL = (process.env.AUTH_SERVICE_URL ?? '').replace(/\/$/, '')
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? ''

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': INTERNAL_KEY,
    ...extra,
  }
}

export async function authServiceLogin(email: string, password: string) {
  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Credenciais inválidas')
  }
  return res.json() as Promise<{
    token: string
    forcePasswordChange: boolean
    user: { id: string; name: string; email: string; role: string; tenantId: string }
  }>
}

export async function authServiceLogout(token: string) {
  await fetch(`${AUTH_URL}/auth/logout`, {
    method: 'POST',
    headers: headers({ Authorization: `Bearer ${token}` }),
  }).catch(() => {
    // Fire-and-forget — cookie will be deleted regardless
  })
}

export async function authServiceRegister(data: {
  name: string
  email: string
  password: string
  tenantId: string
  role?: string
  forcePasswordChange?: boolean
}) {
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Erro ao criar usuário')
  }
  return res.json()
}

export async function authServiceRequestReset(email: string) {
  const res = await fetch(`${AUTH_URL}/auth/password/request-reset`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  })
  return res.json()
}

export async function authServiceValidateCode(email: string, code: string) {
  const res = await fetch(`${AUTH_URL}/auth/password/validate-code`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) throw new Error('Código inválido ou expirado')
  return res.json()
}

export async function authServiceResetPassword(email: string, code: string, newPassword: string) {
  const res = await fetch(`${AUTH_URL}/auth/password/reset`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, code, newPassword }),
  })
  if (!res.ok) throw new Error('Código inválido ou expirado')
  return res.json()
}

export async function authServiceAlterarSenha(token: string, password: string) {
  const res = await fetch(`${AUTH_URL}/auth/password/alterar`, {
    method: 'POST',
    headers: headers({ Authorization: `Bearer ${token}` }),
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('Erro ao alterar senha')
}
