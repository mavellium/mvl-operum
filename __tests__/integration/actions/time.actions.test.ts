// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  cardsApi: {
    createManualEntry: vi.fn(),
    listTimeEntries: vi.fn(),
  },
  timeEntriesApi: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { cardsApi, timeEntriesApi } from '@/lib/api-client'
import {
  addManualTimeAction,
  getTimeEntriesAction,
  updateTimeEntryAction,
  deleteTimeEntryAction,
} from '@/app/actions/time'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addManualTimeAction', () => {
  it('converts hours and minutes to seconds and calls service', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(cardsApi.createManualEntry).mockResolvedValue({ id: 't1', duration: 5400, isManual: true })
    const result = await addManualTimeAction('c1', 1, 30)
    expect(cardsApi.createManualEntry).toHaveBeenCalledWith('c1', { seconds: 5400, description: undefined })
    expect(result).toMatchObject({ entry: { id: 't1' } })
  })

  it('passes description to service when provided', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(cardsApi.createManualEntry).mockResolvedValue({ id: 't1', duration: 3600, description: 'Revisão' })
    await addManualTimeAction('c1', 1, 0, 'Revisão')
    expect(cardsApi.createManualEntry).toHaveBeenCalledWith('c1', { seconds: 3600, description: 'Revisão' })
  })

  it('returns error when total seconds is 0', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await addManualTimeAction('c1', 0, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(cardsApi.createManualEntry).not.toHaveBeenCalled()
  })

  it('returns error when seconds is negative', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await addManualTimeAction('c1', -1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(cardsApi.createManualEntry).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await addManualTimeAction('c1', 1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('getTimeEntriesAction', () => {
  it('returns entries from service for authenticated user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const entries = [{ id: 't1', duration: 3600, description: null, createdAt: new Date() }]
    vi.mocked(cardsApi.listTimeEntries).mockResolvedValue(entries)
    const result = await getTimeEntriesAction('c1')
    expect(cardsApi.listTimeEntries).toHaveBeenCalledWith('c1')
    expect(result).toMatchObject({ entries })
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await getTimeEntriesAction('c1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('updateTimeEntryAction', () => {
  it('converts hours+minutes to seconds and calls service', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(timeEntriesApi.update).mockResolvedValue({ id: 't1', duration: 7200, description: 'Atualizado' })
    const result = await updateTimeEntryAction('t1', 2, 0, 'Atualizado')
    expect(timeEntriesApi.update).toHaveBeenCalledWith('t1', { duration: 7200, description: 'Atualizado' })
    expect(result).toMatchObject({ entry: { id: 't1' } })
  })

  it('returns error when time is zero', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await updateTimeEntryAction('t1', 0, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(timeEntriesApi.update).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await updateTimeEntryAction('t1', 1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('deleteTimeEntryAction', () => {
  it('calls service with entryId', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(timeEntriesApi.delete).mockResolvedValue(undefined)
    const result = await deleteTimeEntryAction('t1')
    expect(timeEntriesApi.delete).toHaveBeenCalledWith('t1')
    expect(result).toMatchObject({ success: true })
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await deleteTimeEntryAction('t1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })

  it('returns error when service throws (e.g. not owner)', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(timeEntriesApi.delete).mockRejectedValue(new Error('Sem permissão'))
    const result = await deleteTimeEntryAction('t1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})
