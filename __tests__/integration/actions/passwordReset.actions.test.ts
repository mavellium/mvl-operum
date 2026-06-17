// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authClient', () => ({
  authServiceRequestReset: vi.fn(),
  authServiceValidateCode: vi.fn(),
  authServiceResetPassword: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  headers: vi.fn().mockResolvedValue(new Headers({ host: 'nairim.operum.mavellium.com.br' })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// Redis rate limiter — desabilitar em testes
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    on: vi.fn(),
  })),
}))

import {
  requestPasswordResetAction,
  validateResetCodeAction,
  resetPasswordAction,
} from '@/app/actions/auth'
import {
  authServiceRequestReset,
  authServiceValidateCode,
  authServiceResetPassword,
} from '@/lib/authClient'

const mockRequestReset = vi.mocked(authServiceRequestReset)
const mockValidateCode = vi.mocked(authServiceValidateCode)
const mockResetPassword = vi.mocked(authServiceResetPassword)

function fd(data: Record<string, string>): FormData {
  const f = new FormData()
  Object.entries(data).forEach(([k, v]) => f.set(k, v))
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── requestPasswordResetAction ────────────────────────────────────────────────

describe('requestPasswordResetAction', () => {
  it('sempre retorna sucesso (e-mail válido)', async () => {
    mockRequestReset.mockResolvedValue({ success: true, message: 'Se o e-mail...' })
    const result = await requestPasswordResetAction(undefined, fd({ email: 'ana@x.com' }))
    expect((result as { success?: boolean }).success).toBe(true)
    expect(mockRequestReset).toHaveBeenCalledWith('ana@x.com', 'nairim')
  })

  it('passa o subdomain extraído do host (não do cliente)', async () => {
    mockRequestReset.mockResolvedValue({ success: true })
    await requestPasswordResetAction(undefined, fd({ email: 'ana@x.com' }))
    const [, subdomain] = mockRequestReset.mock.calls[0]
    expect(subdomain).toBe('nairim')
  })

  it('retorna erro para e-mail inválido (sem chamar authService)', async () => {
    const result = await requestPasswordResetAction(undefined, fd({ email: 'notanemail' }))
    expect((result as { error?: string }).error).toBeTruthy()
    expect(mockRequestReset).not.toHaveBeenCalled()
  })

  it('normaliza e-mail para lowercase antes de enviar', async () => {
    mockRequestReset.mockResolvedValue({ success: true })
    await requestPasswordResetAction(undefined, fd({ email: 'ANA@X.COM' }))
    expect(mockRequestReset.mock.calls[0][0]).toBe('ana@x.com')
  })
})

// ── validateResetCodeAction ───────────────────────────────────────────────────

describe('validateResetCodeAction', () => {
  it('retorna sucesso para código válido', async () => {
    mockValidateCode.mockResolvedValue({ success: true })
    const result = await validateResetCodeAction(
      undefined,
      fd({ email: 'ana@x.com', code: 'A2BCDEFG' }),
    )
    expect((result as { success?: boolean }).success).toBe(true)
    expect(mockValidateCode).toHaveBeenCalledWith('ana@x.com', 'A2BCDEFG', 'nairim')
  })

  it('retorna erro para código com tamanho errado', async () => {
    const result = await validateResetCodeAction(
      undefined,
      fd({ email: 'ana@x.com', code: 'SHORT' }),
    )
    expect((result as { error?: string }).error).toBeTruthy()
    expect(mockValidateCode).not.toHaveBeenCalled()
  })

  it('propaga erro do auth-service com mensagem genérica', async () => {
    mockValidateCode.mockRejectedValue(new Error('Código inválido ou expirado.'))
    const result = await validateResetCodeAction(
      undefined,
      fd({ email: 'ana@x.com', code: 'A2BCDEFG' }),
    )
    expect((result as { error?: string }).error).toBe('Código inválido ou expirado.')
  })
})

// ── resetPasswordAction ───────────────────────────────────────────────────────

describe('resetPasswordAction', () => {
  const validData = {
    email: 'ana@x.com',
    code: 'A2BCDEFG',
    newPassword: 'Teste@123',
    confirmPassword: 'Teste@123',
  }

  it('retorna sucesso para dados válidos', async () => {
    mockResetPassword.mockResolvedValue({ success: true })
    const result = await resetPasswordAction(undefined, fd(validData))
    expect((result as { success?: boolean }).success).toBe(true)
    expect(mockResetPassword).toHaveBeenCalledWith('ana@x.com', 'A2BCDEFG', 'Teste@123', 'nairim')
  })

  it('retorna erro quando senhas não coincidem', async () => {
    const result = await resetPasswordAction(
      undefined,
      fd({ ...validData, confirmPassword: 'Diferente@1' }),
    )
    expect((result as { error?: string }).error).toMatch(/coincidem/i)
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('retorna erro para senha fraca', async () => {
    const result = await resetPasswordAction(
      undefined,
      fd({ ...validData, newPassword: 'fraca', confirmPassword: 'fraca' }),
    )
    expect((result as { error?: string }).error).toBeTruthy()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('não seta cookie de sessão após reset', async () => {
    mockResetPassword.mockResolvedValue({ success: true })
    const { cookies } = await import('next/headers')
    const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)

    await resetPasswordAction(undefined, fd(validData))
    expect(mockCookieStore.set).not.toHaveBeenCalled()
  })
})
