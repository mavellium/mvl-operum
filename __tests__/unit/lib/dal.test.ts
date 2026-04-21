// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))

const { mockDelete, mockGet } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockGet,
    delete: mockDelete,
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) },
}))

import { decrypt } from '@/lib/session'
import { verifySession } from '@/lib/dal'

const mockDecrypt = decrypt as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockReturnValue({ value: 'some-token' })
})

describe('verifySession', () => {
  it('returns session data when JWT is valid', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'admin', tenantId: 't1', tokenVersion: 2 })

    const result = await verifySession()

    expect(result.userId).toBe('u1')
    expect(result.role).toBe('admin')
    expect(result.tenantId).toBe('t1')
    expect(result.isAuth).toBe(true)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('redirects to /login when no session cookie', async () => {
    mockGet.mockReturnValue(undefined)
    mockDecrypt.mockResolvedValue(null)

    await expect(verifySession()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects to /login when JWT is invalid', async () => {
    mockDecrypt.mockResolvedValue(null)

    await expect(verifySession()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects to /login when JWT has no userId', async () => {
    mockDecrypt.mockResolvedValue({ role: 'admin', tenantId: 't1' })

    await expect(verifySession()).rejects.toThrow('REDIRECT:/login')
  })
})
