import { describe, it, expect } from 'vitest'
import { generateApiToken, hashApiToken, API_TOKEN_PREFIX } from '../lib/crypto'

describe('generateApiToken', () => {
  it('gera token com o prefixo opr_pat_', () => {
    const { token } = generateApiToken()
    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true)
  })

  it('prefix retornado é exatamente os 12 primeiros caracteres do token', () => {
    const { token, prefix } = generateApiToken()
    expect(prefix).toBe(token.slice(0, 12))
    expect(prefix).toHaveLength(12)
  })

  it('tem entropia suficiente (sem repetição em 200 gerações)', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateApiToken().token))
    expect(tokens.size).toBe(200)
  })

  it('não contém caracteres fora do base62 após o prefixo', () => {
    const { token } = generateApiToken()
    const raw = token.slice(API_TOKEN_PREFIX.length)
    expect(raw).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('hashApiToken', () => {
  it('retorna string hex de 64 chars (SHA-256)', () => {
    const h = hashApiToken('opr_pat_abc123')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })

  it('é determinístico', () => {
    expect(hashApiToken('opr_pat_abc123')).toBe(hashApiToken('opr_pat_abc123'))
  })

  it('hashes distintos para tokens distintos', () => {
    const { token: t1 } = generateApiToken()
    const { token: t2 } = generateApiToken()
    expect(hashApiToken(t1)).not.toBe(hashApiToken(t2))
  })
})
