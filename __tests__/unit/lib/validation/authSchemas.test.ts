import { describe, it, expect } from 'vitest'
import { SignupSchema, LoginSchema } from '@/lib/validation/authSchemas'

describe('SignupSchema', () => {
  it('rejects empty name', () => {
    const result = SignupSchema.safeParse({ name: '', email: 'a@b.com', password: 'Test@1234' })
    expect(result.success).toBe(false)
  })

  it('rejects email without @', () => {
    const result = SignupSchema.safeParse({ name: 'Ana', email: 'notanemail', password: 'Test@1234' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = SignupSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: 'T@1' })
    expect(result.success).toBe(false)
  })

  it('rejects password with no digit', () => {
    const result = SignupSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: 'Test@pass' })
    expect(result.success).toBe(false)
  })

  it('rejects password with no special character', () => {
    const result = SignupSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: 'Test12345' })
    expect(result.success).toBe(false)
  })

  it('accepts valid signup data', () => {
    const result = SignupSchema.safeParse({ name: 'Ana Silva', email: 'ana@example.com', password: 'Test@1234' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({ name: 'Ana Silva', email: 'ana@example.com' })
      expect(result.data).not.toHaveProperty('passwordHash')
    }
  })
})

describe('LoginSchema', () => {
  it('rejects empty email', () => {
    const result = LoginSchema.safeParse({ email: '', password: 'Test@1234' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'anypassword' })
    expect(result.success).toBe(true)
  })
})
