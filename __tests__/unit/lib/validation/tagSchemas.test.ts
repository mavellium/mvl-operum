import { describe, it, expect } from 'vitest'
import { TagCreateSchema } from '@/lib/validation/tagSchemas'

describe('TagCreateSchema', () => {
  it('rejects empty name', () => {
    const result = TagCreateSchema.safeParse({ name: '', color: '#6b7280', userId: 'u1', boardId: 'b1' })
    expect(result.success).toBe(false)
  })

  it('rejects color not matching hex pattern', () => {
    const result = TagCreateSchema.safeParse({ name: 'bug', color: 'red', userId: 'u1', boardId: 'b1' })
    expect(result.success).toBe(false)
  })

  it('rejects 3-digit hex (must be 6-digit)', () => {
    const result = TagCreateSchema.safeParse({ name: 'bug', color: '#fff', userId: 'u1', boardId: 'b1' })
    expect(result.success).toBe(false)
  })

  it('accepts valid tag data', () => {
    const result = TagCreateSchema.safeParse({ name: 'bug', color: '#ef4444', userId: 'u1', boardId: 'b1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({ name: 'bug', color: '#ef4444' })
    }
  })

  it('accepts tag with default color omitted (uses default)', () => {
    const result = TagCreateSchema.safeParse({ name: 'feature', userId: 'u1', boardId: 'b1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe('#6b7280')
    }
  })
})
