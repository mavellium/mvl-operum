// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/services/sprintService', () => ({
  createSprint: vi.fn(),
}))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

import { createSprintAction } from '@/app/actions/sprints'
import { createSprint } from '@/services/sprintService'
import { verifySession } from '@/lib/dal'

const mockCreate = createSprint as ReturnType<typeof vi.fn>
const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSprintAction', () => {
  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await createSprintAction(undefined, { name: 'Sprint 1' })
    expect(result?.error).toBeTruthy()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates sprint and returns it when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockCreate.mockResolvedValue({ id: 's1', name: 'Sprint 1', status: 'PLANNED' })
    const result = await createSprintAction(undefined, { name: 'Sprint 1' })
    expect(result?.sprint).toMatchObject({ name: 'Sprint 1' })
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})
