// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  cardsApi: {
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    getActiveTimer: vi.fn(),
    getTimeTotal: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'
import {
  startTimerAction,
  pauseTimerAction,
  getCardTimeAction,
  getActiveTimerAction,
} from '@/app/actions/time'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('startTimerAction', () => {
  it('calls startTimer with cardId from session', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.startTimer).mockResolvedValue({ id: 't1', isRunning: true })
    const result = await startTimerAction('clh3v0v7z0000356wf5g95e3')
    expect(cardsApi.startTimer).toHaveBeenCalledWith('clh3v0v7z0000356wf5g95e3')
    expect(result).toHaveProperty('entry')
  })

  it('returns error if not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Não autenticado'))
    const result = await startTimerAction('clh3v0v7z0000356wf5g95e3')
    expect(result).toHaveProperty('error')
  })
})

describe('pauseTimerAction', () => {
  it('calls stopTimer with cardId', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.stopTimer).mockResolvedValue({ id: 't1', isRunning: false })
    const result = await pauseTimerAction('clh3v0v7z0000356wf5g95e3')
    expect(cardsApi.stopTimer).toHaveBeenCalledWith('clh3v0v7z0000356wf5g95e3')
    expect(result).toHaveProperty('entry')
  })
})

describe('getCardTimeAction', () => {
  it('returns total seconds for card', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.getTimeTotal).mockResolvedValue({ seconds: 360 })
    const result = await getCardTimeAction('clh3v0v7z0000356wf5g95e3')
    expect(result).toHaveProperty('seconds', 360)
  })
})

describe('getActiveTimerAction', () => {
  it('returns active timer if running', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.getActiveTimer).mockResolvedValue({ id: 't1', isRunning: true, startedAt: new Date(), duration: 0 })
    const result = await getActiveTimerAction('clh3v0v7z0000356wf5g95e3')
    expect(result).toHaveProperty('entry')
  })

  it('returns null entry if no active timer', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1' })
    vi.mocked(cardsApi.getActiveTimer).mockResolvedValue(null)
    const result = await getActiveTimerAction('clh3v0v7z0000356wf5g95e3')
    expect(result.entry).toBeNull()
  })
})
