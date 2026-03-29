// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/timeService', () => ({
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  getActiveTimer: vi.fn(),
  getTotalDuration: vi.fn(),
  addManualTimeEntry: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { addManualTimeAction } from '@/app/actions/time'
import { addManualTimeEntry } from '@/services/timeService'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockAddManual = addManualTimeEntry as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addManualTimeAction', () => {
  it('converts hours and minutes to seconds and calls service', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockAddManual.mockResolvedValue({ id: 't1', duration: 5400, isManual: true })
    const result = await addManualTimeAction('c1', 1, 30)
    expect(mockAddManual).toHaveBeenCalledWith('u1', 'c1', 5400)
    expect(result).toMatchObject({ entry: { id: 't1' } })
  })

  it('returns error when total seconds is 0', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await addManualTimeAction('c1', 0, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(mockAddManual).not.toHaveBeenCalled()
  })

  it('returns error when seconds is negative', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await addManualTimeAction('c1', -1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(mockAddManual).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await addManualTimeAction('c1', 1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})
