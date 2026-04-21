import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days in seconds
const IS_DEV = process.env.NODE_ENV !== 'production'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis
  private available = true
  private readonly logger = new Logger(RedisService.name)

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: IS_DEV ? 1 : 20,
      retryStrategy: IS_DEV ? () => null : undefined,
    })

    this.client.on('error', () => {
      if (this.available) {
        this.logger.warn('Redis indisponível — sessões em memória desativadas (modo dev)')
        this.available = false
      }
    })

    this.client.on('connect', () => {
      this.available = true
      this.logger.log('Redis conectado')
    })
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined)
  }

  async setSession(jti: string, payload: object): Promise<void> {
    if (!this.available) return
    await this.client.set(`session:${jti}`, JSON.stringify(payload), 'EX', SESSION_TTL).catch(() => undefined)
  }

  async getSession(jti: string): Promise<object | null> {
    if (!this.available) return { dev: true }
    const raw = await this.client.get(`session:${jti}`).catch(() => null)
    if (!raw) return null
    return JSON.parse(raw)
  }

  async deleteSession(jti: string): Promise<void> {
    if (!this.available) return
    await this.client.del(`session:${jti}`).catch(() => undefined)
  }

  async incr(key: string): Promise<number> {
    if (!this.available) return 0
    return this.client.incr(key).catch(() => 0)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.available) return
    await this.client.expire(key, ttlSeconds).catch(() => undefined)
  }
}
