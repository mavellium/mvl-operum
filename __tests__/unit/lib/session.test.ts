// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/session'

describe('encrypt / decrypt', () => {
  it('encrypt returns a JWT string (contains dots)', async () => {
    const token = await encrypt({ userId: 'user1', role: 'member', expiresAt: new Date(Date.now() + 3600_000) })
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('decrypt of a fresh token returns the original userId and role', async () => {
    const payload = { userId: 'user-abc', role: 'admin', expiresAt: new Date(Date.now() + 3600_000) }
    const token = await encrypt(payload)
    const result = await decrypt(token)
    expect(result).not.toBeNull()
    expect(result?.userId).toBe('user-abc')
    expect(result?.role).toBe('admin')
  })

  it('decrypt of an expired token returns null', async () => {
    const payload = { userId: 'user1', role: 'member', expiresAt: new Date(Date.now() - 1000) }
    const token = await encrypt(payload)
    const result = await decrypt(token)
    expect(result).toBeNull()
  })

  it('decrypt of a tampered token returns null', async () => {
    const payload = { userId: 'user1', role: 'member', expiresAt: new Date(Date.now() + 3600_000) }
    const token = await encrypt(payload)
    const parts = token.split('.')
    parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'admin' })).toString('base64url')
    const tampered = parts.join('.')
    const result = await decrypt(tampered)
    expect(result).toBeNull()
  })

  it('decrypt of empty string returns null without throwing', async () => {
    const result = await decrypt('')
    expect(result).toBeNull()
  })

  it('decrypt of undefined returns null without throwing', async () => {
    const result = await decrypt(undefined)
    expect(result).toBeNull()
  })
})
