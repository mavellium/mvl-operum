// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServiceUnavailableException } from '@nestjs/common'
const { client, events } = vi.hoisted(() => ({
  client: { get: vi.fn(), set: vi.fn(), del: vi.fn(), on: vi.fn(), quit: vi.fn().mockResolvedValue(undefined) },
  events: new Map<string, () => void>(),
}))
vi.mock('ioredis', () => ({ default: vi.fn().mockImplementation(function () {
  client.on.mockImplementation((name: string, handler: () => void) => { events.set(name, handler) })
  return client
}) }))
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })
describe('Redis session acknowledgement in production', () => {
  it('never substitutes proof or confirms writes during outage, then recovers', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { RedisService } = await import('../redis/redis.service')
    const redis = new RedisService()
    redis.onModuleInit()
    events.get('error')!()
    await expect(redis.getSession('j')).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(redis.setSession('j', {})).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(redis.deleteSession('j')).rejects.toBeInstanceOf(ServiceUnavailableException)
    events.get('ready')!()
    client.get.mockResolvedValue(null)
    expect(await redis.getSession('j')).toBeNull()
    client.set.mockRejectedValue(new Error('OOM'))
    await expect(redis.setSession('j', {})).rejects.toBeInstanceOf(ServiceUnavailableException)
    client.set.mockResolvedValue('OK')
    await expect(redis.setSession('j', {})).resolves.toBeUndefined()
  })
})
