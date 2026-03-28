import { describe, it, expect } from 'vitest'
import { UserProfileSchema, ChangePasswordSchema } from '@/lib/validation/userSchemas'

describe('UserProfileSchema', () => {
  it('accepts valid input', () => {
    const result = UserProfileSchema.safeParse({
      name: 'Ana Silva',
      email: 'ana@example.com',
      cargo: 'Dev',
      departamento: 'TI',
      valorHora: 50,
    })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 chars', () => {
    const result = UserProfileSchema.safeParse({ name: 'A', email: 'a@b.com', valorHora: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/2 caracteres/)
  })

  it('rejects invalid email', () => {
    const result = UserProfileSchema.safeParse({ name: 'Ana', email: 'not-email', valorHora: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative valorHora', () => {
    const result = UserProfileSchema.safeParse({ name: 'Ana', email: 'a@b.com', valorHora: -1 })
    expect(result.success).toBe(false)
  })

  it('coerces string valorHora to number', () => {
    const result = UserProfileSchema.safeParse({ name: 'Ana', email: 'a@b.com', valorHora: '75.5' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.valorHora).toBe(75.5)
  })

  it('allows optional cargo and departamento', () => {
    const result = UserProfileSchema.safeParse({ name: 'Ana', email: 'a@b.com', valorHora: 0 })
    expect(result.success).toBe(true)
  })
})

describe('ChangePasswordSchema', () => {
  const valid = {
    senhaAtual: 'OldPass1!',
    novaSenha: 'NewPass1!',
    confirmacao: 'NewPass1!',
  }

  it('accepts valid input', () => {
    expect(ChangePasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects new password shorter than 8 chars', () => {
    const result = ChangePasswordSchema.safeParse({ ...valid, novaSenha: 'Ab1!', confirmacao: 'Ab1!' })
    expect(result.success).toBe(false)
  })

  it('rejects new password without number', () => {
    const result = ChangePasswordSchema.safeParse({ ...valid, novaSenha: 'NoNumber!', confirmacao: 'NoNumber!' })
    expect(result.success).toBe(false)
  })

  it('rejects new password without special char', () => {
    const result = ChangePasswordSchema.safeParse({ ...valid, novaSenha: 'NoSpecial1', confirmacao: 'NoSpecial1' })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched confirmacao', () => {
    const result = ChangePasswordSchema.safeParse({ ...valid, confirmacao: 'Different1!' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('confirmacao')
  })

  it('rejects empty senhaAtual', () => {
    const result = ChangePasswordSchema.safeParse({ ...valid, senhaAtual: '' })
    expect(result.success).toBe(false)
  })
})
