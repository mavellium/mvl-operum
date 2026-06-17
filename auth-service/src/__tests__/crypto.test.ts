import { describe, it, expect } from 'vitest'
import {
  generateResetCode,
  hashResetCode,
  compareResetCode,
  RESET_CODE_CHARSET,
  RESET_CODE_LENGTH,
} from '../lib/crypto'

const ALLOWED = new Set(RESET_CODE_CHARSET)
const AMBIGUOUS = new Set('0O1IL')

describe('generateResetCode', () => {
  it('retorna exatamente 8 caracteres', () => {
    expect(generateResetCode()).toHaveLength(RESET_CODE_LENGTH)
  })

  it('usa apenas o charset permitido (sem 0, O, 1, I, L)', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateResetCode()
      for (const ch of code) {
        expect(ALLOWED.has(ch), `char ambíguo "${ch}" encontrado`).toBe(true)
        expect(AMBIGUOUS.has(ch), `char ambíguo "${ch}" presente`).toBe(false)
      }
    }
  })

  it('produz apenas maiúsculas', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateResetCode()
      expect(code).toBe(code.toUpperCase())
    }
  })

  it('tem entropia suficiente (sem repetição trivial em 200 chamadas)', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateResetCode()))
    expect(codes.size).toBeGreaterThan(195)
  })
})

describe('hashResetCode', () => {
  it('retorna string hex de 64 chars (SHA-256)', () => {
    const h = hashResetCode('ABCDEFGH')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })

  it('é determinístico', () => {
    expect(hashResetCode('ABCDEFGH')).toBe(hashResetCode('ABCDEFGH'))
  })

  it('hashes distintos para inputs distintos', () => {
    expect(hashResetCode('ABCDEFGH')).not.toBe(hashResetCode('ABCDEFGJ'))
  })
})

describe('compareResetCode', () => {
  it('retorna true para código e hash corretos', () => {
    const code = 'A2BCDEFG'
    expect(compareResetCode(code, hashResetCode(code))).toBe(true)
  })

  it('retorna false para código errado', () => {
    expect(compareResetCode('WRONGCOD', hashResetCode('A2BCDEFG'))).toBe(false)
  })

  it('retorna false para hash adulterado', () => {
    const code = 'A2BCDEFG'
    const hash = hashResetCode(code)
    const tampered = hash.replace(hash[0], hash[0] === 'a' ? 'b' : 'a')
    expect(compareResetCode(code, tampered)).toBe(false)
  })
})
