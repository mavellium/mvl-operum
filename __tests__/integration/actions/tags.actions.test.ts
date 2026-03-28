// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/tagService', () => ({
  createTag: vi.fn(),
  assignTagToCard: vi.fn(),
}))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

import { createTagAction, assignTagToCardAction } from '@/app/actions/tags'
import { createTag, assignTagToCard } from '@/services/tagService'
import { verifySession } from '@/lib/dal'

const mockCreate = createTag as ReturnType<typeof vi.fn>
const mockAssign = assignTagToCard as ReturnType<typeof vi.fn>
const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTagAction', () => {
  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await createTagAction({ name: 'bug', boardId: 'b1' })
    expect(result?.error).toBeTruthy()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates tag owned by current user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockCreate.mockResolvedValue({ id: 't1', name: 'bug', color: '#ef4444', userId: 'u1', boardId: 'b1' })
    const result = await createTagAction({ name: 'bug', boardId: 'b1' })
    expect(result?.tag?.userId).toBe('u1')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'bug' }))
  })
})

describe('assignTagToCardAction', () => {
  it('creates CardTag record when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockAssign.mockResolvedValue({ cardId: 'c1', tagId: 't1' })
    const result = await assignTagToCardAction('c1', 't1')
    expect(result?.success).toBe(true)
    expect(mockAssign).toHaveBeenCalledWith('c1', 't1')
  })
})
