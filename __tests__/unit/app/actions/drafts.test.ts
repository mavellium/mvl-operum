// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    projectDraft: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/notificationPublisher', () => ({
  publishNotification: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { publishNotification } from '@/lib/notificationPublisher'
import { saveDraftAction, deleteDraftAction } from '@/app/actions/drafts'

const mockSession = { isAuth: true, userId: 'u1', tenantId: 't1', role: 'member' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveDraftAction', () => {
  it('deve fazer upsert de rascunho para projeto novo (projectId null) e retornar draftId', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectDraft.upsert).mockResolvedValue({ id: 'd1' } as never)

    const result = await saveDraftAction({
      projectId: null,
      data: { form: { name: 'Rascunho', slogan: '' }, macroFases: [] },
    })

    expect(result).toHaveProperty('draftId', 'd1')
    expect(prisma.projectDraft.upsert).toHaveBeenCalledOnce()
  })

  it('deve fazer upsert de rascunho para projeto existente (projectId preenchido)', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.findFirst).mockResolvedValue({ id: 'd2' } as never)
    vi.mocked(prisma.projectDraft.upsert).mockResolvedValue({ id: 'd2' } as never)

    const result = await saveDraftAction({
      projectId: 'p1',
      data: { form: { name: 'Projeto Existente' }, macroFases: [] },
    })

    expect(result).toHaveProperty('draftId', 'd2')
    expect(prisma.projectDraft.upsert).toHaveBeenCalledOnce()
  })

  it('deve disparar notificação apenas na primeira vez que o rascunho é criado', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectDraft.upsert).mockResolvedValue({ id: 'd3' } as never)

    await saveDraftAction({
      projectId: null,
      data: { form: { name: 'Meu Projeto' }, macroFases: [] },
    })

    expect(publishNotification).toHaveBeenCalledOnce()
    expect(publishNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE', userId: 'u1' })
    )
  })

  it('não deve disparar notificação quando rascunho já existe (update)', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.findFirst).mockResolvedValue({ id: 'd4' } as never)
    vi.mocked(prisma.projectDraft.upsert).mockResolvedValue({ id: 'd4' } as never)

    await saveDraftAction({
      projectId: 'p2',
      data: { form: { name: 'Atualização' }, macroFases: [] },
    })

    expect(publishNotification).not.toHaveBeenCalled()
  })

  it('deve retornar error quando a sessão falha', async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error('Unauthorized'))

    const result = await saveDraftAction({
      projectId: null,
      data: { form: {}, macroFases: [] },
    })

    expect(result).toHaveProperty('error')
  })
})

describe('deleteDraftAction', () => {
  it('deve deletar todos os rascunhos de um projeto ao publicar', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.deleteMany).mockResolvedValue({ count: 1 } as never)

    const result = await deleteDraftAction({ projectId: 'p1' })

    expect(result).toHaveProperty('success', true)
    expect(prisma.projectDraft.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: 'p1', tenantId: 't1' }),
      })
    )
  })

  it('deve deletar rascunho de projeto novo pelo draftId', async () => {
    vi.mocked(verifySession).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.projectDraft.deleteMany).mockResolvedValue({ count: 1 } as never)

    const result = await deleteDraftAction({ projectId: null, draftId: 'd1' })

    expect(result).toHaveProperty('success', true)
    expect(prisma.projectDraft.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'd1', tenantId: 't1' }),
      })
    )
  })

  it('deve retornar error quando a sessão falha', async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error('Unauthorized'))

    const result = await deleteDraftAction({ projectId: 'p1' })

    expect(result).toHaveProperty('error')
  })
})
