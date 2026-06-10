// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  filesApi: {
    setCover: vi.fn(),
    delete: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { filesApi } from '@/lib/api-client'
import { setCoverAction } from '@/app/actions/attachments'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setCoverAction', () => {
  it('sets isCover true on target and false on all other card attachments', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    vi.mocked(filesApi.setCover).mockResolvedValue(undefined)

    const result = await setCoverAction('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
    expect(result).toMatchObject({ success: true })
    expect(filesApi.setCover).toHaveBeenCalledWith('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await setCoverAction('clh3v0v7z0000356wf5g95e3', 'clh3v0v7z0001356wf5g95e4')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})
