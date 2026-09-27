import { describe, it, expect } from 'vitest'
import { CreateApiTokenSchema } from '../api-tokens/dto/create-api-token.dto'
import { IntrospectApiTokenSchema } from '../api-tokens/dto/introspect-api-token.dto'

describe('CreateApiTokenSchema', () => {
  it('aceita payload válido mínimo', () => {
    const result = CreateApiTokenSchema.safeParse({ name: 'Claude Code', scopes: ['read'] })
    expect(result.success).toBe(true)
  })

  it('aceita expiresInDays opcional', () => {
    const result = CreateApiTokenSchema.safeParse({ name: 'x', scopes: ['read', 'write'], expiresInDays: 30 })
    expect(result.success).toBe(true)
  })

  it('rejeita name ausente', () => {
    const result = CreateApiTokenSchema.safeParse({ scopes: ['read'] })
    expect(result.success).toBe(false)
  })

  it('rejeita name vazio', () => {
    const result = CreateApiTokenSchema.safeParse({ name: '', scopes: ['read'] })
    expect(result.success).toBe(false)
  })

  it('rejeita scopes vazio', () => {
    const result = CreateApiTokenSchema.safeParse({ name: 'x', scopes: [] })
    expect(result.success).toBe(false)
  })

  it('rejeita scope inválido', () => {
    const result = CreateApiTokenSchema.safeParse({ name: 'x', scopes: ['delete'] })
    expect(result.success).toBe(false)
  })

  it.each([0, -1, 366])('rejeita expiresInDays fora do range (%i)', (value) => {
    const result = CreateApiTokenSchema.safeParse({ name: 'x', scopes: ['read'], expiresInDays: value })
    expect(result.success).toBe(false)
  })
})

describe('IntrospectApiTokenSchema', () => {
  it('aceita token válido', () => {
    const result = IntrospectApiTokenSchema.safeParse({ token: 'opr_pat_abc' })
    expect(result.success).toBe(true)
  })

  it('rejeita token ausente', () => {
    const result = IntrospectApiTokenSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejeita token vazio', () => {
    const result = IntrospectApiTokenSchema.safeParse({ token: '' })
    expect(result.success).toBe(false)
  })
})
