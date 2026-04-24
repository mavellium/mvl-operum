// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set SESSION_SECRET before any module is imported so verifyToken's HS256 branch runs
vi.hoisted(() => {
  process.env.SESSION_SECRET = 'test-session-secret-32-chars-minimum!'
})

// Mock jwtVerify so tests control whether the token is accepted or rejected
vi.mock('jose', async (importOriginal) => {
  const original = await importOriginal<typeof import('jose')>()
  return { ...original, jwtVerify: vi.fn() }
})

import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { proxy } from '@/proxy'

function makeRequest(path: string, cookie?: string) {
  const url = `http://localhost${path}`
  const headers: Record<string, string> = {}
  if (cookie) headers['cookie'] = cookie
  return new NextRequest(url, { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('proxy middleware', () => {
  it('calls next() when token is valid', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { userId: 'u1' } } as never)

    const req = makeRequest('/dashboard', 'session=valid-token')
    const res = await proxy(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects to /login and deletes cookie when token is invalid', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid token'))

    const req = makeRequest('/dashboard', 'session=bad-token')
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/session/)
  })

  it('redirects to /login immediately when no session cookie present', async () => {
    const req = makeRequest('/dashboard')
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(jwtVerify).not.toHaveBeenCalled()
  })

  it('includes original path as ?from= param on redirect', async () => {
    const req = makeRequest('/sprints/s1')
    const res = await proxy(req)

    const location = res.headers.get('location') ?? ''
    expect(location).toContain('from=%2Fsprints%2Fs1')
  })
})
