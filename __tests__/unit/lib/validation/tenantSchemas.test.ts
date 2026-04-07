import { describe, it, expect } from 'vitest'
import { CreateTenantSchema, UpdateTenantSchema } from '@/lib/validation/tenantSchemas'

describe('CreateTenantSchema', () => {
  it('accepts valid tenant data', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'Empresa ACME',
      subdominio: 'acme',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({ nome: 'Empresa ACME', subdominio: 'acme' })
    }
  })

  it('rejects empty nome', () => {
    const result = CreateTenantSchema.safeParse({
      nome: '',
      subdominio: 'acme',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty subdominio', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdominio shorter than 3 chars', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: 'ab',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdominio with special characters', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: 'acme@corp',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdominio with spaces', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: 'acme corp',
    })
    expect(result.success).toBe(false)
  })

  it('accepts subdominio with hyphens', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME Corp',
      subdominio: 'acme-corp',
    })
    expect(result.success).toBe(true)
  })

  it('normalizes subdominio to lowercase', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: 'ACME',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subdominio).toBe('acme')
    }
  })

  it('accepts optional config as JSON object', () => {
    const result = CreateTenantSchema.safeParse({
      nome: 'ACME',
      subdominio: 'acme',
      config: { theme: 'dark', maxUsers: 50 },
    })
    expect(result.success).toBe(true)
  })

  it('trims nome whitespace', () => {
    const result = CreateTenantSchema.safeParse({
      nome: '  ACME  ',
      subdominio: 'acme',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nome).toBe('ACME')
    }
  })
})

describe('UpdateTenantSchema', () => {
  it('accepts partial update with only nome', () => {
    const result = UpdateTenantSchema.safeParse({ nome: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = UpdateTenantSchema.safeParse({ status: 'INATIVO' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = UpdateTenantSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts config update', () => {
    const result = UpdateTenantSchema.safeParse({ config: { maxUsers: 100 } })
    expect(result.success).toBe(true)
  })
})
