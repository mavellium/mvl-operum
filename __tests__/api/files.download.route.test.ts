// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({ verifyRouteSession: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ filesApi: { getPresignedUrl: vi.fn() } }))

import { GET } from '@/app/api/files/[attachmentId]/download/route'
import { verifyRouteSession } from '@/lib/routeAuth'
import { filesApi } from '@/lib/api-client'

const ANEXO = 'clh3v0v7z0001356wf5g95e4'
const CARD = 'clh3v0v7z0000356wf5g95e3'
const ASSINADA = 'https://storage-prod.operum.adm.br/mvloperum-prod/uploads/x/foto.jpg?X-Amz-Signature=abc'

const chamar = (attachmentId = ANEXO, cardId: string | null = CARD) =>
  GET(new Request(`http://localhost/api/files/${attachmentId}/download${cardId === null ? '' : `?cardId=${cardId}`}`), {
    params: Promise.resolve({ attachmentId }),
  })

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MINIO_PUBLIC_URL = 'https://storage-prod.operum.adm.br'
  vi.mocked(verifyRouteSession).mockResolvedValue({ userId: 'u1', tenantId: 't1' } as never)
})

describe('GET /api/files/:id/download (SDD 4.2)', () => {
  it('redireciona (302) para a URL assinada do storage, sem cache', async () => {
    vi.mocked(filesApi.getPresignedUrl).mockResolvedValue({ url: ASSINADA })
    const res = await chamar()
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe(ASSINADA)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    // Com o cardId, o file-service confere que o anexo é desse card (SDD 4.1).
    expect(filesApi.getPresignedUrl).toHaveBeenCalledWith(ANEXO, CARD)
  })

  it('sem sessão: 401', async () => {
    vi.mocked(verifyRouteSession).mockResolvedValue(null as never)
    expect((await chamar()).status).toBe(401)
    expect(filesApi.getPresignedUrl).not.toHaveBeenCalled()
  })

  it.each([
    ['attachmentId inválido', '../x', CARD],
    ['sem cardId', ANEXO, null],
    ['cardId inválido', ANEXO, 'abc'],
  ])('400: %s', async (_caso, id, card) => {
    expect((await chamar(id, card)).status).toBe(400)
    expect(filesApi.getPresignedUrl).not.toHaveBeenCalled()
  })

  it('anexo de outro card ou tenant (404 no file-service): 404', async () => {
    vi.mocked(filesApi.getPresignedUrl).mockRejectedValue(Object.assign(new Error('Anexo não encontrado'), { status: 404 }))
    expect((await chamar()).status).toBe(404)
  })

  it.each([
    ['link de vídeo (não é do storage)', 'https://www.youtube.com/watch?v=x'],
    ['host interno do MinIO', 'http://minio:9000/mvloperum-prod/uploads/x?X-Amz-Signature=abc'],
  ])('não redireciona para %s', async (_caso, url) => {
    vi.mocked(filesApi.getPresignedUrl).mockResolvedValue({ url })
    const res = await chamar()
    expect(res.status).toBe(404)
    expect(res.headers.get('Location')).toBeNull()
  })
})
