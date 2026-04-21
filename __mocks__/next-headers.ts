import { vi } from 'vitest'

export const cookies = vi.fn().mockResolvedValue({
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn().mockReturnValue(false),
})

export const headers = vi.fn().mockResolvedValue(new Headers())
