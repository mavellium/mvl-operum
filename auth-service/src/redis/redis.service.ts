import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    })
  }

  async onModuleDestroy() {
    await this.client.quit()
  }

  async setSession(jti: string, payload: object): Promise<void> {
    await this.client.set(`session:${jti}`, JSON.stringify(payload), 'EX', SESSION_TTL)
  }

  async getSession(jti: string): Promise<object | null> {
    const raw = await this.client.get(`session:${jti}`)
    if (!raw) return null
    return JSON.parse(raw)
  }

  async deleteSession(jti: string): Promise<void> {
    await this.client.del(`session:${jti}`)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds)
  }
}
