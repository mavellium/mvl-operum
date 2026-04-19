// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { ConflictError, AuthError } = vi.hoisted(() => {
  class ConflictError extends Error {
    constructor(msg: string) { super(msg); this.name = 'ConflictError' }
  }
  class AuthError extends Error {
    constructor(msg: string) { super(msg); this.name = 'AuthError' }
  }
  return { ConflictError, AuthError }
})

vi.mock('@/services/authService', () => ({
  register: vi.fn(),
  login: vi.fn(),
  ConflictError,
  AuthError,
}))
vi.mock('@/lib/session', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    tenant: { findFirst: vi.fn() },
  },
}))
vi.mock('@/services/projectService', () => ({
  getUserActiveProjects: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { signupAction, loginAction, logoutAction } from '@/app/actions/auth'
import { register, login } from '@/services/authService'
import { encrypt } from '@/lib/session'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getUserActiveProjects } from '@/services/projectService'

const mockRegister = register as ReturnType<typeof vi.fn>
const mockLogin = login as ReturnType<typeof vi.fn>
const mockEncrypt = encrypt as ReturnType<typeof vi.fn>
const mockCookies = cookies as ReturnType<typeof vi.fn>
const mockHeaders = headers as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>
const mockPrismaTenant = (prisma as any).tenant
const mockGetProjects = getUserActiveProjects as ReturnType<typeof vi.fn>

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => fd.set(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrismaTenant.findFirst.mockResolvedValue({ id: 't1', status: 'ACTIVE' })
  mockHeaders.mockResolvedValue({ get: vi.fn().mockReturnValue(null) })
  mockGetProjects.mockResolvedValue([{ projectId: 'p1' }, { projectId: 'p2' }])
})

describe('signupAction', () => {
  it('returns error state when registration fails with conflict', async () => {
    mockRegister.mockRejectedValue(Object.assign(new Error('Email já cadastrado'), { name: 'ConflictError' }))
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
    mockLogin.mockRejectedValue(Object.assign(new Error('Credenciais inválidas'), { name: 'AuthError' }))
    const result = await loginAction(undefined, makeFormData({ email: 'a@b.com', password: 'wrong' }))
    expect(result?.message).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('sets session cookie on valid login', async () => {
    mockLogin.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1', tokenVersion: 0 })
    mockEncrypt.mockResolvedValue('jwt-token')
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
    const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() }
    mockCookies.mockResolvedValue(cookieStore)
    await logoutAction()
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
  })
})
