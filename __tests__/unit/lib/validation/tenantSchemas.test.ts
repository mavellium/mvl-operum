import { describe, it, expect } from 'vitest'
import { CreateTenantSchema, UpdateTenantSchema } from '@/lib/validation/tenantSchemas'

describe('CreateTenantSchema', () => {
  it('accepts valid tenant data', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'Empresa ACME',
      subdomain: 'acme',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({ name: 'Empresa ACME', subdomain: 'acme' })
    }
  })

  it('rejects empty name', () => {
    const result = CreateTenantSchema.safeParse({
      name: '',
      subdomain: 'acme',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty subdomain', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdomain shorter than 3 chars', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: 'ab',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdomain with special characters', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: 'acme@corp',
    })
    expect(result.success).toBe(false)
  })

  it('rejects subdomain with spaces', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: 'acme corp',
    })
    expect(result.success).toBe(false)
  })

  it('accepts subdomain with hyphens', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME Corp',
      subdomain: 'acme-corp',
    })
    expect(result.success).toBe(true)
  })

  it('normalizes subdomain to lowercase', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: 'ACME',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subdomain).toBe('acme')
    }
  })

  it('accepts optional config as JSON object', () => {
    const result = CreateTenantSchema.safeParse({
      name: 'ACME',
      subdomain: 'acme',
      config: { theme: 'dark', maxUsers: 50 },
    })
    expect(result.success).toBe(true)
  })

  it('trims name whitespace', () => {
    const result = CreateTenantSchema.safeParse({
      name: '  ACME  ',
      subdomain: 'acme',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('ACME')
    }
  })
})

describe('UpdateTenantSchema', () => {
  it('accepts partial update with only name', () => {
    const result = UpdateTenantSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = UpdateTenantSchema.safeParse({ status: 'INACTIVE' })
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
