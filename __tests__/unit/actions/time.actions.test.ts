// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/services/timeService', () => ({
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  getActiveTimer: vi.fn(),
  getTotalDuration: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { startTimer, pauseTimer, getActiveTimer, getTotalDuration } from '@/services/timeService'
import {
  startTimerAction,
  pauseTimerAction,
  getCardTimeAction,
  getActiveTimerAction,
} from '@/app/actions/time'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockStart = startTimer as ReturnType<typeof vi.fn>
const mockPause = pauseTimer as ReturnType<typeof vi.fn>
const mockActive = getActiveTimer as ReturnType<typeof vi.fn>
const mockTotal = getTotalDuration as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('startTimerAction', () => {
  it('calls startTimer with userId from session', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockStart.mockResolvedValue({ id: 't1', isRunning: true })
    const result = await startTimerAction('c1')
    expect(mockStart).toHaveBeenCalledWith('u1', 'c1')
    expect(result).toHaveProperty('entry')
  })

  it('returns error if not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Não autenticado'))
    const result = await startTimerAction('c1')
    expect(result).toHaveProperty('error')
  })
})

describe('pauseTimerAction', () => {
  it('calls pauseTimer with userId from session', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockPause.mockResolvedValue({ id: 't1', isRunning: false })
    const result = await pauseTimerAction('c1')
    expect(mockPause).toHaveBeenCalledWith('u1', 'c1')
    expect(result).toHaveProperty('entry')
  })
})

describe('getCardTimeAction', () => {
  it('returns total seconds for user on card', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockTotal.mockResolvedValue(360)
    const result = await getCardTimeAction('c1')
    expect(result).toHaveProperty('seconds', 360)
  })
})

describe('getActiveTimerAction', () => {
  it('returns active timer if running', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockActive.mockResolvedValue({ id: 't1', isRunning: true, startedAt: new Date(), duration: 0 })
    const result = await getActiveTimerAction('c1')
    expect(result).toHaveProperty('entry')
  })

  it('returns null entry if no active timer', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    mockActive.mockResolvedValue(null)
    const result = await getActiveTimerAction('c1')
    expect(result.entry).toBeNull()
  })
})
