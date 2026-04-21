// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  tagsApi: {
    create: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
  cardsApi: {
    addTag: vi.fn(),
    removeTag: vi.fn(),
  },
}))

import { createTagAction, assignTagToCardAction } from '@/app/actions/tags'
import { tagsApi, cardsApi } from '@/lib/api-client'
import { verifySession } from '@/lib/dal'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTagAction', () => {
  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await createTagAction({ name: 'bug' })
    expect(result?.error).toBeTruthy()
    expect(tagsApi.create).not.toHaveBeenCalled()
  })

  it('creates tag owned by current user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(tagsApi.create).mockResolvedValue({ id: 't1', name: 'bug' })
    const result = await createTagAction({ name: 'bug' })
    expect(result?.tag).toMatchObject({ name: 'bug' })
    expect(tagsApi.create).toHaveBeenCalledWith('bug', undefined)
  })
})

describe('assignTagToCardAction', () => {
  it('creates CardTag record when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(cardsApi.addTag).mockResolvedValue(undefined)
    const result = await assignTagToCardAction('c1', 't1')
    expect(result?.success).toBe(true)
    expect(cardsApi.addTag).toHaveBeenCalledWith('c1', 't1')
  })
})
