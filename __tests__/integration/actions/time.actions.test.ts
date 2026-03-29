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
  getTimeEntries: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import {
  addManualTimeAction,
  getTimeEntriesAction,
  updateTimeEntryAction,
  deleteTimeEntryAction,
} from '@/app/actions/time'
import { addManualTimeEntry, getTimeEntries, updateTimeEntry, deleteTimeEntry } from '@/services/timeService'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockAddManual = addManualTimeEntry as ReturnType<typeof vi.fn>
const mockGetEntries = getTimeEntries as ReturnType<typeof vi.fn>
const mockUpdate = updateTimeEntry as ReturnType<typeof vi.fn>
const mockDelete = deleteTimeEntry as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addManualTimeAction', () => {
  it('converts hours and minutes to seconds and calls service', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockAddManual.mockResolvedValue({ id: 't1', duration: 5400, isManual: true })
    const result = await addManualTimeAction('c1', 1, 30)
    expect(mockAddManual).toHaveBeenCalledWith('u1', 'c1', 5400, undefined)
    expect(result).toMatchObject({ entry: { id: 't1' } })
  })

  it('passes description to service when provided', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockAddManual.mockResolvedValue({ id: 't1', duration: 3600, description: 'Revisão' })
    await addManualTimeAction('c1', 1, 0, 'Revisão')
    expect(mockAddManual).toHaveBeenCalledWith('u1', 'c1', 3600, 'Revisão')
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

describe('getTimeEntriesAction', () => {
  it('returns entries from service for authenticated user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const entries = [{ id: 't1', duration: 3600, description: null, createdAt: new Date() }]
    mockGetEntries.mockResolvedValue(entries)
    const result = await getTimeEntriesAction('c1')
    expect(mockGetEntries).toHaveBeenCalledWith('u1', 'c1')
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
    mockUpdate.mockResolvedValue({ id: 't1', duration: 7200, description: 'Atualizado' })
    const result = await updateTimeEntryAction('t1', 2, 0, 'Atualizado')
    expect(mockUpdate).toHaveBeenCalledWith('t1', 'u1', { duration: 7200, description: 'Atualizado' })
    expect(result).toMatchObject({ entry: { id: 't1' } })
  })

  it('returns error when time is zero', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    const result = await updateTimeEntryAction('t1', 0, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await updateTimeEntryAction('t1', 1, 0)
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})

describe('deleteTimeEntryAction', () => {
  it('calls service with entryId and userId', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockDelete.mockResolvedValue({ id: 't1' })
    const result = await deleteTimeEntryAction('t1')
    expect(mockDelete).toHaveBeenCalledWith('t1', 'u1')
    expect(result).toMatchObject({ success: true })
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await deleteTimeEntryAction('t1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })

  it('returns error when service throws (e.g. not owner)', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockDelete.mockRejectedValue(new Error('Sem permissão'))
    const result = await deleteTimeEntryAction('t1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})
