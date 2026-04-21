// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  sprintsApi: {
    create: vi.fn(),
  },
}))

import { createSprintAction } from '@/app/actions/sprints'
import { sprintsApi } from '@/lib/api-client'
import { verifySession } from '@/lib/dal'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSprintAction', () => {
  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await createSprintAction(undefined, { name: 'Sprint 1' })
    expect(result?.error).toBeTruthy()
    expect(sprintsApi.create).not.toHaveBeenCalled()
  })

  it('creates sprint and returns it when authenticated', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(sprintsApi.create).mockResolvedValue({ id: 's1', name: 'Sprint 1', status: 'PLANNED' })
    const result = await createSprintAction(undefined, { name: 'Sprint 1' })
    expect(result?.sprint).toMatchObject({ name: 'Sprint 1' })
    expect(sprintsApi.create).toHaveBeenCalledOnce()
  })
})
