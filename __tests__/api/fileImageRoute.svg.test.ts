// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({ verifyRouteSession: vi.fn().mockResolvedValue({ userId: 'u1' }) }))
vi.mock('@/lib/api-client', () => ({ filesApi: { getPresignedUrl: vi.fn().mockResolvedValue({ url: 'https://storage/x' }) } }))
vi.mock('@/lib/storageUrl', () => ({ isSafeStorageUrl: () => true }))

import { GET } from '@/app/api/files/[attachmentId]/image/route'

const ID = 'cmv9o8fpk000001n77x1bhi68'
function servir(tipo: string, corpo = '<svg/>') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(corpo, { headers: { 'content-type': tipo } })))
  return GET(new Request(`http://app/api/files/${ID}/image`), { params: Promise.resolve({ attachmentId: ID }) })
}

beforeEach(() => vi.unstubAllGlobals())

describe('/api/files/:id/image', () => {
  it('SVG sai com CSP sandbox e nosniff (nada nele executa)', async () => {
    const res = await servir('image/svg+xml')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('content-security-policy')).toContain('sandbox')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('PNG continua servido, sem CSP de SVG', async () => {
    const res = await servir('image/png', 'png')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-security-policy')).toBeNull()
  })

  it('HTML continua recusado', async () => {
    expect((await servir('text/html', '<script>')).status).toBe(415)
  })
})
