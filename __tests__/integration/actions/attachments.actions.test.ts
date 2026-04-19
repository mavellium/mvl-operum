// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    attachment: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { verifySession } from '@/lib/dal'
import { setCoverAction } from '@/app/actions/attachments'
import prisma from '@/lib/prisma'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockPrisma = prisma as {
  attachment: {
    updateMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  card: { findUnique: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setCoverAction', () => {
  it('sets isCover true on target and false on all other card attachments', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    mockPrisma.card.findUnique.mockResolvedValue({ sprint: { project: { tenantId: 't1' } }, sprintId: 's1' })
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      return fn(prisma)
    })
    mockPrisma.attachment.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.attachment.update.mockResolvedValue({ id: 'a1', isCover: true })

    const result = await setCoverAction('c1', 'a1')
    expect(result).toMatchObject({ success: true })
    expect(mockPrisma.attachment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cardId: 'c1' }),
        data: { isCover: false },
      }),
    )
    expect(mockPrisma.attachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { isCover: true },
      }),
    )
  })

  it('returns error when not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Unauthorized'))
    const result = await setCoverAction('c1', 'a1')
    expect(result).toMatchObject({ error: expect.any(String) })
  })
})
