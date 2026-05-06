// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    projectDraft: {
      findMany: vi.fn(),
    },
  },
}))

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { getDraftsWithProjectsAction } from '@/app/actions/drafts'

beforeEach(() => vi.clearAllMocks())

describe('getDraftsWithProjectsAction', () => {
  it('deve retornar lista de rascunhos para usuário admin', async () => {
    vi.mocked(verifySession).mockResolvedValue({
      isAuth: true, userId: 'u1', tenantId: 't1', role: 'admin',
    } as never)
    vi.mocked(prisma.projectDraft.findMany).mockResolvedValue([
      { id: 'd1', projectId: 'p1', savedAt: new Date('2026-05-03'), authorId: 'u2' },
      { id: 'd2', projectId: null, savedAt: new Date('2026-05-03'), authorId: 'u3' },
    ] as never)

    const result = await getDraftsWithProjectsAction()

    expect(result).toHaveProperty('drafts')
    if ('drafts' in result) {
      expect(result.drafts).toHaveLength(2)
      expect(result.drafts[0]).toHaveProperty('projectId', 'p1')
      expect(result.drafts[1]).toHaveProperty('projectId', null)
    }
  })

  it('deve retornar error para usuário não-admin', async () => {
    vi.mocked(verifySession).mockResolvedValue({
      isAuth: true, userId: 'u1', tenantId: 't1', role: 'member',
    } as never)

    const result = await getDraftsWithProjectsAction()

    expect(result).toHaveProperty('error')
    expect(prisma.projectDraft.findMany).not.toHaveBeenCalled()
  })

  it('deve filtrar rascunhos pelo tenantId da sessão', async () => {
    vi.mocked(verifySession).mockResolvedValue({
      isAuth: true, userId: 'u1', tenantId: 't1', role: 'admin',
    } as never)
    vi.mocked(prisma.projectDraft.findMany).mockResolvedValue([] as never)

    await getDraftsWithProjectsAction()

    expect(prisma.projectDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      })
    )
  })

  it('deve retornar error quando a sessão falha', async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error('Unauthorized'))

    const result = await getDraftsWithProjectsAction()

    expect(result).toHaveProperty('error')
  })
})
