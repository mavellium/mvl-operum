// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { UploadController } from './upload.controller'
import type { UploadService } from './upload.service'

const service = {
  upload: vi.fn(), addLink: vi.fn(), listByCards: vi.fn(), setCover: vi.fn(),
  rename: vi.fn(), delete: vi.fn(), getPresignedUrl: vi.fn(),
}
const controller = new UploadController(service as unknown as UploadService)

beforeEach(() => vi.clearAllMocks())

describe('UploadController', () => {
  it.each([undefined, '', 'tenant com espaço', '../t1'])('recusa tenant ausente ou inválido (%s)', async tenant => {
    await expect(controller.listByCards('c1', 'u1', tenant as string)).rejects.toThrow(UnauthorizedException)
    expect(service.listByCards).not.toHaveBeenCalled()
  })

  it('repassa o tenant e o cardId ao service', async () => {
    await controller.delete('a1', 'c1', 'u1', 't1')
    expect(service.delete).toHaveBeenCalledWith('a1', 'u1', 't1', 'c1')
    await controller.getPresignedUrl('a1', undefined, 'u1', 't1')
    expect(service.getPresignedUrl).toHaveBeenCalledWith('a1', 'u1', 't1', undefined)
  })

  it.each([
    ['attachmentId com barra', () => controller.delete('../a1', undefined, 'u1', 't1')],
    ['cardId inválido', () => controller.getPresignedUrl('a1', 'c 1', 'u1', 't1')],
    ['capa sem cardId', () => controller.setCover('a1', {} as { cardId: string }, 'u1', 't1')],
    ['mais de 500 cards', () => controller.listByCards(Array.from({ length: 501 }, (_, i) => `c${i}`).join(','), 'u1', 't1')],
  ])('400: %s', async (_caso, chamar) => {
    await expect(chamar()).rejects.toThrow(BadRequestException)
  })

  it('as rotas de avatar e logo não existem mais', () => {
    expect((controller as unknown as Record<string, unknown>).uploadAvatar).toBeUndefined()
    expect((controller as unknown as Record<string, unknown>).uploadLogo).toBeUndefined()
  })
})
