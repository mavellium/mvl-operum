// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  filesApi: {
    setCover: vi.fn(),
    delete: vi.fn(),
    rename: vi.fn(),
    getPresignedUrl: vi.fn(),
  },
  cardsApi: {
    get: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { filesApi, cardsApi } from '@/lib/api-client'
import { setCoverAction, renameAttachmentAction, getAttachmentUrlAction, deleteAttachmentAction } from '@/app/actions/attachments'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setCoverAction', () => {
  it('sets isCover true on target and false on all other card attachments', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'clh3v0v7z0000356wf5g95e3' } as never)
    vi.mocked(filesApi.setCover).mockResolvedValue(undefined)

    const result = await setCoverAction('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
    expect(result).toMatchObject({ success: true })
    expect(filesApi.setCover).toHaveBeenCalledWith('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
  })

  it('card de outro tenant: erro e a capa não muda (antes a action não conferia o card)', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    vi.mocked(cardsApi.get).mockRejectedValue(Object.assign(new Error('Card não encontrado'), { status: 404 }))
    const result = await setCoverAction('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
    expect(result).toMatchObject({ error: 'Card não encontrado' })
    expect(filesApi.setCover).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await setCoverAction('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('as actions repassam o cardId: o file-service recusa anexo de outro card (SDD 4.1)', () => {
  const CARD = 'clh3v0v7z0000356wf5g95e3'
  const ANEXO = 'clh3v0v7z0001356wf5g95e4'

  beforeEach(() => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: CARD } as never)
  })

  it('renomear', async () => {
    vi.mocked(filesApi.rename).mockResolvedValue({ id: ANEXO, fileName: 'novo.pdf' })
    await expect(renameAttachmentAction(ANEXO, CARD, 'novo.pdf')).resolves.toEqual({ success: true })
    expect(filesApi.rename).toHaveBeenCalledWith(ANEXO, 'novo.pdf', CARD)
  })

  it('abrir (URL assinada)', async () => {
    vi.mocked(filesApi.getPresignedUrl).mockResolvedValue({ url: 'https://storage/x' })
    await expect(getAttachmentUrlAction(ANEXO, CARD)).resolves.toEqual({ url: 'https://storage/x' })
    expect(filesApi.getPresignedUrl).toHaveBeenCalledWith(ANEXO, CARD)
  })

  it('excluir', async () => {
    vi.mocked(filesApi.delete).mockResolvedValue(undefined)
    await expect(deleteAttachmentAction(ANEXO, CARD)).resolves.toEqual({ success: true })
    expect(filesApi.delete).toHaveBeenCalledWith(ANEXO, CARD)
  })
})
