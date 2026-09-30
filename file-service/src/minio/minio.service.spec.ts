// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { MinioService } from './minio.service'

beforeEach(() => {
  process.env.MINIO_ENDPOINT = 'minio'
  process.env.MINIO_PORT = '9000'
  process.env.MINIO_USE_SSL = 'false'
  process.env.MINIO_BUCKET = 'mvloperum-prod'
  process.env.MINIO_ACCESS_KEY = 'chave'
  process.env.MINIO_SECRET_KEY = 'segredo'
  process.env.MINIO_PUBLIC_URL = 'https://storage-prod.operum.adm.br/'
})

describe('MinioService.getPresignedUrl (SDD 4.2)', () => {
  it('assina com o host público, não com o container interno', async () => {
    const url = new URL(await new MinioService().getPresignedUrl('uploads/c1/foto.jpg'))
    expect(url.origin).toBe('https://storage-prod.operum.adm.br')
    expect(url.pathname).toBe('/mvloperum-prod/uploads/c1/foto.jpg')
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy()
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3600')
    expect(url.host).not.toContain('minio')
  })

  it('sem MINIO_PUBLIC_URL, assina com o endpoint interno (ambiente local sem proxy)', async () => {
    process.env.MINIO_PUBLIC_URL = ''
    const url = new URL(await new MinioService().getPresignedUrl('uploads/c1/foto.jpg'))
    expect(url.origin).toBe('http://minio:9000')
  })

  it('extractKey continua reconhecendo o caminho público gravado no anexo', () => {
    const minio = new MinioService()
    expect(minio.extractKey('https://storage-prod.operum.adm.br/mvloperum-prod/uploads/c1/foto.jpg')).toBe('uploads/c1/foto.jpg')
    expect(minio.extractKey('https://youtu.be/abc')).toBeNull()
  })
})
