// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/authClient', () => ({
  authServiceRegister: vi.fn(),
  authServiceLogin: vi.fn(),
  authServiceLogout: vi.fn(),
  authServiceRequestReset: vi.fn(),
  authServiceValidateCode: vi.fn(),
  authServiceResetPassword: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}))
vi.mock('@/lib/api-client', () => ({
  projectsApi: {
    getUserProjects: vi.fn(),
  },
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { signupAction, loginAction, logoutAction } from '@/app/actions/auth'
import { authServiceRegister, authServiceLogin, authServiceLogout } from '@/lib/authClient'
import { encrypt } from '@/lib/session'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { projectsApi } from '@/lib/api-client'

const mockRegister = authServiceRegister as ReturnType<typeof vi.fn>
const mockLogin = authServiceLogin as ReturnType<typeof vi.fn>
const mockLogout = authServiceLogout as ReturnType<typeof vi.fn>
const mockEncrypt = encrypt as ReturnType<typeof vi.fn>
const mockCookies = cookies as ReturnType<typeof vi.fn>
const mockHeaders = headers as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => fd.set(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DEFAULT_TENANT_ID = 't1'
  mockHeaders.mockResolvedValue({ get: vi.fn().mockReturnValue(null) })
  vi.mocked(projectsApi.getUserProjects).mockResolvedValue([])
})

describe('signupAction', () => {
  it('returns error state when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Email já cadastrado'))
    const result = await signupAction(undefined, makeFormData({ name: 'Ana', email: 'ana@x.com', password: 'Test@1234' }))
    expect(result?.message).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('sets session cookie and redirects on success', async () => {
    mockRegister.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'member', tenantId: 't1', tokenVersion: 0 })
    mockEncrypt.mockResolvedValue('jwt-token')
    const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() }
    mockCookies.mockResolvedValue(cookieStore)

    await signupAction(undefined, makeFormData({ name: 'Ana', email: 'ana@x.com', password: 'Test@1234' }))
    expect(cookieStore.set).toHaveBeenCalledWith(
      'session',
      'jwt-token',
      expect.objectContaining({ httpOnly: true }),
    )
  })
})

describe('loginAction', () => {
  it('returns error state for invalid credentials', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciais inválidas'))
    const result = await loginAction(undefined, makeFormData({ email: 'a@b.com', password: 'wrong' }))
    expect(result?.message).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('sets session cookie on valid login', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token',
      forcePasswordChange: false,
      user: { role: 'member', id: 'u1' },
    })
    const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() }
    mockCookies.mockResolvedValue(cookieStore)

    await loginAction(undefined, makeFormData({ email: 'a@b.com', password: 'Test@1234' }))
    expect(cookieStore.set).toHaveBeenCalledWith(
      'session',
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    )
  })
})

describe('logoutAction', () => {
  it('deletes session cookie', async () => {
    const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn().mockReturnValue(undefined) }
    mockCookies.mockResolvedValue(cookieStore)
    await logoutAction()
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
  })
})
