// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/sprintService', () => ({
  createSprint: vi.fn(),
  assignCardToSprint: vi.fn(),
}))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

import { createSprintAction, assignCardToSprintAction } from '@/app/actions/sprints'
import { createSprint, assignCardToSprint } from '@/services/sprintService'
import { verifySession } from '@/lib/dal'

const mockCreate = createSprint as ReturnType<typeof vi.fn>
const mockAssign = assignCardToSprint as ReturnType<typeof vi.fn>
const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSprintAction', () => {
  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await createSprintAction(undefined, { name: 'Sprint 1', boardId: 'b1' })
    expect(result?.error).toBeTruthy()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates sprint and returns it when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockCreate.mockResolvedValue({ id: 's1', name: 'Sprint 1', boardId: 'b1', status: 'PLANNED' })
    const result = await createSprintAction(undefined, { name: 'Sprint 1', boardId: 'b1' })
    expect(result?.sprint).toMatchObject({ name: 'Sprint 1' })
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})

describe('assignCardToSprintAction', () => {
  it('updates card sprint when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockAssign.mockResolvedValue({ id: 'c1', sprintId: 's1' })
    const result = await assignCardToSprintAction('c1', 's1')
    expect(result?.success).toBe(true)
    expect(mockAssign).toHaveBeenCalledWith('c1', 's1')
  })
})
