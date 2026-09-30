// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    attachment: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

import { prisma } from '../prisma'
import { UploadService } from './upload.service'
import type { MinioService } from '../minio/minio.service'
import type { CardScope } from './card-scope'

const db = prisma as unknown as { attachment: Record<string, ReturnType<typeof vi.fn>> }

// Tenant t1 é dono de c1 e c2; c-outro é de outro tenant.
const DO_TENANT = new Set(['c1', 'c2'])
const scope = {
  inTenant: vi.fn(async (_t: string, ids: string[]) => new Set(ids.filter(id => DO_TENANT.has(id)))),
  assert: vi.fn(async (_t: string, id: string) => {
    if (!DO_TENANT.has(id)) throw new NotFoundException('Card não encontrado')
  }),
}
const minio = {
  upload: vi.fn(async (key: string) => `https://storage/operum/${key}`),
  delete: vi.fn(),
  extractKey: vi.fn((url: string) => url.replace('https://storage/operum/', '')),
  getPresignedUrl: vi.fn(async () => 'https://storage/assinada'),
  buildKey: vi.fn((type: string, id: string, name: string) => `${type}/${id}/${name}`),
}
const service = new UploadService(minio as unknown as MinioService, scope as unknown as CardScope)

const png = { mimetype: 'image/png', originalname: 'eap.png', size: 4, buffer: Buffer.from('png!') } as Express.Multer.File
const anexo = (cardId: string) => ({ id: 'a1', cardId, filePath: `https://storage/operum/uploads/${cardId}/x.png` })

beforeEach(() => vi.clearAllMocks())

describe('upload e link: card de outro tenant não recebe anexo', () => {
  it('upload para card do tenant grava no MinIO e no banco', async () => {
    db.attachment.create.mockResolvedValue({ id: 'a1' })
    await service.upload(png, 'c1', 'u1', 't1')
    expect(minio.upload).toHaveBeenCalled()
    expect(db.attachment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cardId: 'c1' }) })
  })

  it('upload para card de outro tenant: 404 antes de tocar no MinIO', async () => {
    await expect(service.upload(png, 'c-outro', 'u1', 't1')).rejects.toThrow(NotFoundException)
    expect(minio.upload).not.toHaveBeenCalled()
    expect(db.attachment.create).not.toHaveBeenCalled()
  })

  it('link para card de outro tenant: 404 sem gravar', async () => {
    await expect(service.addLink('c-outro', 'https://youtu.be/x', undefined, 'u1', 't1')).rejects.toThrow(NotFoundException)
    expect(db.attachment.create).not.toHaveBeenCalled()
  })

  it('sprint-service fora do ar: recusa (503), não libera', async () => {
    scope.assert.mockRejectedValueOnce(new ServiceUnavailableException('x'))
    await expect(service.upload(png, 'c1', 'u1', 't1')).rejects.toThrow(ServiceUnavailableException)
    expect(minio.upload).not.toHaveBeenCalled()
  })
})

describe('listByCards: só anexos dos cards do tenant', () => {
  it('consulta só os ids do tenant', async () => {
    db.attachment.findMany.mockResolvedValue([])
    await service.listByCards(['c1', 'c-outro'], 'u1', 't1')
    expect(db.attachment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cardId: { in: ['c1'] }, deletedAt: null },
    }))
  })

  it('nenhum card do tenant: lista vazia sem consultar o banco', async () => {
    await expect(service.listByCards(['c-outro'], 'u1', 't1')).resolves.toEqual([])
    expect(db.attachment.findMany).not.toHaveBeenCalled()
  })
})

describe('rotas por anexo: conferem o card do próprio anexo', () => {
  it.each([
    ['rename', () => service.rename('a1', 'novo.png', 'u1', 't1')],
    ['delete', () => service.delete('a1', 'u1', 't1')],
    ['getPresignedUrl', () => service.getPresignedUrl('a1', 'u1', 't1')],
    ['setCover', () => service.setCover('a1', 'c-outro', 'u1', 't1')],
  ])('%s em anexo de outro tenant: 404 "Anexo não encontrado" e nada muda', async (_op, chamar) => {
    db.attachment.findUnique.mockResolvedValue(anexo('c-outro'))
    await expect(chamar()).rejects.toThrow('Anexo não encontrado')
    expect(db.attachment.update).not.toHaveBeenCalled()
    expect(db.attachment.updateMany).not.toHaveBeenCalled()
    expect(minio.delete).not.toHaveBeenCalled()
    expect(minio.getPresignedUrl).not.toHaveBeenCalled()
  })

  it.each([
    ['rename', () => service.rename('a1', 'novo.png', 'u1', 't1', 'c2')],
    ['delete', () => service.delete('a1', 'u1', 't1', 'c2')],
    ['getPresignedUrl', () => service.getPresignedUrl('a1', 'u1', 't1', 'c2')],
    ['setCover', () => service.setCover('a1', 'c2', 'u1', 't1')],
  ])('%s com cardId de outro card do mesmo tenant: 404', async (_op, chamar) => {
    db.attachment.findUnique.mockResolvedValue(anexo('c1'))
    await expect(chamar()).rejects.toThrow('Anexo não encontrado')
    expect(db.attachment.update).not.toHaveBeenCalled()
  })

  it('delete do anexo do tenant: apaga do MinIO e marca como excluído', async () => {
    db.attachment.findUnique.mockResolvedValue(anexo('c1'))
    await service.delete('a1', 'u1', 't1', 'c1')
    expect(minio.delete).toHaveBeenCalledWith('uploads/c1/x.png')
    expect(db.attachment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { deletedAt: expect.any(Date) } })
  })

  it('setCover no card certo troca a capa', async () => {
    db.attachment.findUnique.mockResolvedValue(anexo('c1'))
    db.attachment.update.mockResolvedValue({ id: 'a1', isCover: true })
    await service.setCover('a1', 'c1', 'u1', 't1')
    expect(db.attachment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { cardId: 'c1', isCover: true, deletedAt: null } }))
  })
})
