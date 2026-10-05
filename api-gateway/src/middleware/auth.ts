import { Request, Response, NextFunction } from 'express'
import { jwtVerify, importSPKI } from 'jose'
import { createHash } from 'crypto'
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

// Rota interna do auth-service — nunca deve ser alcançável através do gateway,
// pois o proxy injeta X-Internal-Api-Key incondicionalmente em toda requisição
// proxiada, o que transformaria esta rota num oráculo de validação de tokens
// de qualquer tenant se fosse exposta publicamente.
const BLOCKED_PATHS = ['/auth/api-tokens/introspect']

// PATs servem à automação (MCP). No auth-service só alcançam leituras de
// identidade — allowlist, não denylist: rotas de sessão/conta (switch-tenant,
// join-tenant, logout, senha, admin, api-tokens) nunca aceitam PAT, inclusive
// rotas novas que venham a ser criadas. O auth-service repete o bloqueio (NoPatGuard).
const PAT_AUTH_ALLOWLIST = new Set(['GET /auth/me', 'GET /auth/my-tenants', 'GET /auth/all-users'])

function normalizePath(path: string): string {
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // path malformado — mantém o original (não casará com a allowlist)
  }
  return ('/' + decoded.split('/').filter(Boolean).join('/')).toLowerCase()
}

export function isPatAllowed(method: string, path: string): boolean {
  const normalized = normalizePath(path)
  if (normalized !== '/auth' && !normalized.startsWith('/auth/')) return true
  return PAT_AUTH_ALLOWLIST.has(`${method.toUpperCase()} ${normalized}`)
}

const PAT_PREFIX = 'opr_pat_'
const PAT_CACHE_TTL_SECONDS = 60
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_CACHE_HOST ?? 'redis-cache',
      port: Number(process.env.REDIS_CACHE_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
      connectTimeout: 2000,
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

interface IntrospectResult {
  active: boolean
  userId: string | null
  tenantId: string | null
  role: string | null
  scopes: string[]
  tokenId: string | null
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Introspecta um PAT junto ao auth-service, com cache no Redis (TTL 60s).
 * Retorna `null` quando nem o cache nem o auth-service estão disponíveis —
 * nesse caso o chamador deve falhar fechado (503). Sessões JWT também
 * exigem prova atual da autoridade em produção.
 */
async function introspectPat(token: string): Promise<IntrospectResult | null> {
  const hash = hashToken(token)
  const cacheKey = `pat:${hash}`
  let redisAvailable = true

  try {
    const cached = await getRedis().get(cacheKey)
    if (cached) return JSON.parse(cached) as IntrospectResult
  } catch {
    redisAvailable = false
  }

  const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001'
  const internalApiKey = process.env.INTERNAL_API_KEY ?? ''

  let result: IntrospectResult | null = null
  try {
    const response = await fetch(`${authServiceUrl}/auth/api-tokens/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': internalApiKey },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) result = (await response.json()) as IntrospectResult
  } catch {
    result = null
  }

  if (!result) return null

  if (redisAvailable) {
    try {
      await getRedis().set(cacheKey, JSON.stringify(result), 'EX', PAT_CACHE_TTL_SECONDS)
    } catch {
      // Falha ao gravar cache não impede a requisição de prosseguir — já temos o resultado.
    }
  }

  return result
}

export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path

    if (BLOCKED_PATHS.some(p => path === p || path.startsWith(`${p}/`))) {
      return res.status(404).end()
    }

    // Nunca confiar em headers de identidade vindos do cliente — cada branch
    // abaixo (PAT ou JWT) os reatribui explicitamente a partir de uma fonte
    // verificada. Sem esta limpeza, um cliente poderia anexar x-auth-type/
    // x-api-token-id a uma requisição autenticada por JWT e eles passariam
    // adiante sem terem sido de fato validados.
    delete req.headers['x-user-id']
    delete req.headers['x-tenant-id']
    delete req.headers['x-user-role']
    delete req.headers['x-auth-type']
    delete req.headers['x-api-token-id']

    // Skip auth for public paths
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
      return next()
    }

    const authorization = req.headers['authorization'] as string
    const token = authorization?.replace('Bearer ', '') ?? (req.cookies?.session as string)

    if (!token) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    if (token.startsWith(PAT_PREFIX)) {
      const introspection = await introspectPat(token)
      if (!introspection) {
        return res.status(503).json({ error: 'Operum indisponível no momento, tente novamente.' })
      }
      if (!introspection.active) {
        return res.status(401).json({ error: 'Token inválido ou revogado' })
      }
      if (!isPatAllowed(req.method, path)) {
        return res.status(403).json({ error: 'Operação não permitida com Personal Access Token' })
      }
      if (WRITE_METHODS.has(req.method) && !introspection.scopes.includes('write')) {
        return res.status(403).json({ error: 'Token sem permissão de escrita (escopo read)' })
      }

      req.headers['x-user-id'] = introspection.userId ?? undefined
      req.headers['x-tenant-id'] = introspection.tenantId ?? undefined
      req.headers['x-user-role'] = introspection.role ?? undefined
      req.headers['x-auth-type'] = 'pat'
      req.headers['x-api-token-id'] = introspection.tokenId ?? undefined

      return next()
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    // A assinatura não comprova revogação. A autoridade verifica sessão e usuário
    // persistido em toda requisição de produção, sem cache de validade.
    if (process.env.NODE_ENV === 'production') {
      if (!payload.jti) return res.status(401).json({ error: 'Sessão inválida' })
      try {
        const response = await fetch(`${process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001'}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Request-ID': String(req.headers['x-request-id'] ?? '') },
          signal: AbortSignal.timeout(3000),
        })
        if (response.status === 401) return res.status(401).json({ error: 'Sessão inválida ou expirada' })
        if (!response.ok) return res.status(503).json({ error: 'Autenticação indisponível. Tente novamente.' })
        const identity = await response.json() as Record<string, unknown>
        if (identity.userId !== payload.userId || identity.tenantId !== payload.tenantId || typeof identity.role !== 'string') {
          return res.status(503).json({ error: 'Autenticação indisponível. Tente novamente.' })
        }
        payload.role = identity.role
      } catch {
        return res.status(503).json({ error: 'Autenticação indisponível. Tente novamente.' })
      }
    }

    // Inject context headers for downstream services
    req.headers['x-user-id'] = payload.userId
    req.headers['x-tenant-id'] = payload.tenantId
    req.headers['x-user-role'] = payload.role

    next()
  }
}
