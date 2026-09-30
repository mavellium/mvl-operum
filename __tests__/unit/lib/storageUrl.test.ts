import { describe, it, expect } from 'vitest'
import { isSafeStorageUrl } from '@/lib/storageUrl'

const PUBLICO = 'https://storage-prod.operum.adm.br/'

describe('isSafeStorageUrl', () => {
  it('aceita URL assinada do host público do storage', () => {
    expect(isSafeStorageUrl('https://storage-prod.operum.adm.br/bucket/k.jpg?X-Amz-Signature=a', PUBLICO)).toBe(true)
  })

  it.each([
    ['host interno do container', 'http://minio:9000/bucket/k.jpg'],
    ['outro host', 'https://evil.com/bucket/k.jpg'],
    ['subdomínio parecido', 'https://storage-prod.operum.adm.br.evil.com/k.jpg'],
    ['protocolo diferente', 'http://storage-prod.operum.adm.br/k.jpg'],
    ['porta diferente', 'https://storage-prod.operum.adm.br:8443/k.jpg'],
    ['javascript:', 'javascript:alert(1)'],
    ['lixo', 'não é url'],
  ])('recusa %s', (_caso, url) => {
    expect(isSafeStorageUrl(url, PUBLICO)).toBe(false)
  })

  it('sem MINIO_PUBLIC_URL, recusa tudo (falha fechada)', () => {
    expect(isSafeStorageUrl('https://storage-prod.operum.adm.br/k.jpg', '')).toBe(false)
  })
})
