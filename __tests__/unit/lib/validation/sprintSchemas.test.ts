import { describe, it, expect } from 'vitest'
import { SprintCreateSchema, SprintUpdateSchema } from '@/lib/validation/sprintSchemas'

describe('SprintCreateSchema', () => {
  it('rejects empty name', () => {
    const result = SprintCreateSchema.safeParse({ name: '', boardId: 'board1' })
    expect(result.success).toBe(false)
  })

  it('rejects endDate before startDate', () => {
    const result = SprintCreateSchema.safeParse({
      name: 'Sprint 1',
      boardId: 'board1',
      startDate: '2026-04-15',
      endDate: '2026-04-01',
    })
    expect(result.success).toBe(false)
  })

  it('accepts name + boardId with no dates', () => {
    const result = SprintCreateSchema.safeParse({ name: 'Sprint 1', boardId: 'board1' })
    expect(result.success).toBe(true)
  })

  it('accepts valid dates in correct order', () => {
    const result = SprintCreateSchema.safeParse({
      name: 'Sprint 1',
      boardId: 'board1',
      startDate: '2026-04-01',
      endDate: '2026-04-15',
    })
    expect(result.success).toBe(true)
  })
})

describe('SprintUpdateSchema', () => {
  it('allows partial update with only status', () => {
    const result = SprintUpdateSchema.safeParse({ status: 'ACTIVE' })
    expect(result.success).toBe(true)
  })

  it('allows partial update with only name', () => {
    const result = SprintUpdateSchema.safeParse({ name: 'Sprint 2' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = SprintUpdateSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })
})
