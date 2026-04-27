import { Request, Response, NextFunction } from 'express'
import { jwtVerify, importSPKI } from 'jose'
import Redis from 'ioredis'

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/tenants/',
  '/auth/password/request-reset',
  '/auth/password/validate-code',
  '/auth/password/reset',
  '/auth/verify',
  '/health',
]

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    })
  }
  return redisClient
}

interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  tokenVersion: number
  jti?: string
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  const publicKeyPem = process.env.JWT_PUBLIC_KEY
    ? normalizePem(process.env.JWT_PUBLIC_KEY)
    : null

  if (publicKeyPem) {
    try {
      const publicKey = await importSPKI(publicKeyPem, 'RS256')
      const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
      return payload as unknown as JwtPayload
    } catch {
      // fall through
    }
  }

  const secret = process.env.SESSION_SECRET
  if (secret) {
    try {
      const secretKey = new TextEncoder().encode(secret)
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
      return payload as unknown as JwtPayload
    } catch {
      return null
    }
  }

  return null
}

export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path

    // Skip auth for public paths
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
      return next()
    }

    const authorization = req.headers['authorization'] as string
    const token = authorization?.replace('Bearer ', '') ?? (req.cookies?.session as string)

    if (!token) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    // Verify session in Redis only in production (dev uses JWT signature only)
    if (payload.jti && process.env.NODE_ENV === 'production') {
      try {
        const redis = getRedis()
        const session = await redis.get(`session:${payload.jti}`)
        if (!session) {
          return res.status(401).json({ error: 'Sessão expirada' })
        }
      } catch {
        // Redis unavailable — allow request (fail open in degraded mode)
      }
    }

    // Inject context headers for downstream services
    req.headers['x-user-id'] = payload.userId
    req.headers['x-tenant-id'] = payload.tenantId
    req.headers['x-user-role'] = payload.role

    next()
  }
}
