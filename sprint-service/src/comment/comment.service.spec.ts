// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: { comment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } },
}))

vi.mock('../common/tenant-scope', () => ({ assertCard: vi.fn() }))

import { prisma } from '../prisma'
import { assertCard } from '../common/tenant-scope'
import { CommentService } from './comment.service'

const db = prisma as unknown as { comment: Record<string, ReturnType<typeof vi.fn>> }
const assertCardMock = assertCard as unknown as ReturnType<typeof vi.fn>

let service: CommentService

beforeEach(() => {
  vi.clearAllMocks()
  assertCardMock.mockResolvedValue(undefined)
  service = new CommentService()
})

describe('CommentService — escopo por tenant', () => {
  it('list/create validam que o card é do tenant', async () => {
    assertCardMock.mockRejectedValue(new NotFoundException())
    await expect(service.listByCard('t1', 'card-b')).rejects.toThrow(NotFoundException)
    await expect(service.create('t1', 'card-b', 'u1', 'oi')).rejects.toThrow(NotFoundException)
    expect(db.comment.findMany).not.toHaveBeenCalled()
    expect(db.comment.create).not.toHaveBeenCalled()
  })

  it('update/remove exigem que o comentário pertença ao card da URL', async () => {
    db.comment.findUnique.mockResolvedValue({ id: 'm1', cardId: 'outro-card', userId: 'u1', deletedAt: null })
    await expect(service.update('t1', 'c1', 'm1', 'u1', 'x')).rejects.toThrow(NotFoundException)
    await expect(service.remove('t1', 'c1', 'm1', 'u1')).rejects.toThrow(NotFoundException)
    expect(db.comment.update).not.toHaveBeenCalled()
  })

  it('mantém a regra de só o autor editar', async () => {
    db.comment.findUnique.mockResolvedValue({ id: 'm1', cardId: 'c1', userId: 'autor', deletedAt: null })
    await expect(service.update('t1', 'c1', 'm1', 'outro', 'x')).rejects.toThrow(ForbiddenException)
  })
})
