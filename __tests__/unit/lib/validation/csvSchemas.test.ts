import { describe, it, expect } from 'vitest'
import { CsvRowSchema } from '@/lib/validation/csvSchemas'

describe('CsvRowSchema', () => {
  it('rejects row missing title', () => {
    const result = CsvRowSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('accepts minimal row with only title', () => {
    const result = CsvRowSchema.safeParse({ title: 'Fix bug' })
    expect(result.success).toBe(true)
  })

  it('accepts full row with all optional fields', () => {
    const result = CsvRowSchema.safeParse({
      title: 'Fix bug',
      description: 'Details here',
      responsible: 'João',
      status: 'A Fazer',
      sprint: 'Sprint 1',
      tags: 'bug|frontend',
      startDate: '2026-04-01',
      endDate: '2026-04-15',
      color: '#3b82f6',
    })
    expect(result.success).toBe(true)
  })

  it('coerces startDate and endDate strings to Date objects', () => {
    const result = CsvRowSchema.safeParse({ title: 'Task', startDate: '2026-04-01', endDate: '2026-04-15' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date)
      expect(result.data.endDate).toBeInstanceOf(Date)
    }
  })

  it('trims whitespace from string fields', () => {
    const result = CsvRowSchema.safeParse({ title: '  Fix bug  ', responsible: '  João  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Fix bug')
      expect(result.data.responsible).toBe('João')
    }
  })

  it('rejects unparseable startDate', () => {
    const result = CsvRowSchema.safeParse({ title: 'Task', startDate: 'not-a-date' })
    expect(result.success).toBe(false)
  })

  it('leaves undefined optional fields as undefined', () => {
    const result = CsvRowSchema.safeParse({ title: 'Task' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeUndefined()
      expect(result.data.startDate).toBeUndefined()
    }
  })
})
