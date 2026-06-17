import { describe, it, expect } from 'vitest'
import {
  PasswordSchema,
  RequestResetSchema,
  ValidateCodeSchema,
  ResetPasswordSchema,
} from '@/lib/validation/authSchemas'

describe('PasswordSchema', () => {
  it('aceita senha válida', () => {
    expect(PasswordSchema.safeParse('Teste@123').success).toBe(true)
  })
  it('rejeita senha < 8 chars', () => {
    expect(PasswordSchema.safeParse('T@1').success).toBe(false)
  })
  it('rejeita senha sem número', () => {
    expect(PasswordSchema.safeParse('Teste@abc').success).toBe(false)
  })
  it('rejeita senha sem caractere especial', () => {
    expect(PasswordSchema.safeParse('Teste12345').success).toBe(false)
  })
})

describe('RequestResetSchema', () => {
  it('aceita e-mail válido', () => {
    expect(RequestResetSchema.safeParse({ email: 'ana@x.com' }).success).toBe(true)
  })
  it('rejeita e-mail inválido', () => {
    expect(RequestResetSchema.safeParse({ email: 'notanemail' }).success).toBe(false)
  })
  it('rejeita e-mail vazio', () => {
    expect(RequestResetSchema.safeParse({ email: '' }).success).toBe(false)
  })
})

describe('ValidateCodeSchema', () => {
  it('aceita código válido de 8 chars do charset', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'A2BCDEFG' }).success).toBe(true)
  })
  it('rejeita código com menos de 8 chars', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'A2BCDE' }).success).toBe(false)
  })
  it('rejeita código com mais de 8 chars', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'A2BCDEFGH' }).success).toBe(false)
  })
  it('rejeita código com dígito 0 (zero)', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'A2BCDE0F' }).success).toBe(false)
  })
  it('rejeita código com dígito 1 (um)', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'A1BCDEFG' }).success).toBe(false)
  })
  it('rejeita código com minúsculas', () => {
    expect(ValidateCodeSchema.safeParse({ email: 'a@b.com', code: 'a2bcdefg' }).success).toBe(false)
  })
})

describe('ResetPasswordSchema', () => {
  const valid = { email: 'a@b.com', code: 'A2BCDEFG', newPassword: 'Teste@123' }

  it('aceita dados válidos', () => {
    expect(ResetPasswordSchema.safeParse(valid).success).toBe(true)
  })
  it('rejeita senha fraca', () => {
    expect(ResetPasswordSchema.safeParse({ ...valid, newPassword: 'fraca' }).success).toBe(false)
  })
  it('rejeita código com caractere inválido (dígito 0)', () => {
    expect(ResetPasswordSchema.safeParse({ ...valid, code: 'A2BCDE0F' }).success).toBe(false)
  })
  it('rejeita código curto demais', () => {
    expect(ResetPasswordSchema.safeParse({ ...valid, code: 'A2BCDE' }).success).toBe(false)
  })
  it('rejeita e-mail inválido', () => {
    expect(ResetPasswordSchema.safeParse({ ...valid, email: 'invalid' }).success).toBe(false)
  })
})
