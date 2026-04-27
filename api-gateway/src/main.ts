import 'dotenv/config'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from './middleware/auth'

const app = express()

// Rate limiting: 100 req/s per IP, burst 200
app.use(
  rateLimit({
    windowMs: 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  }),
)

// CORS
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-ID,X-Internal-Api-Key')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

// Health check (unauthenticated)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Auth middleware — validates JWT and injects x-user-id / x-tenant-id / x-user-role
app.use(authMiddleware())

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ''

// prefix: the path segment Express strips — we rewrite it back so downstream services
// receive the full original path (e.g. /auth/me, not just /me)
function proxyTo(target: string, prefix: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${prefix}${path}`,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('X-Internal-Api-Key', INTERNAL_API_KEY)
      },
    },
  })
}

// Route table
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001'
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL ?? 'http://project-service:4002'
const SPRINT_SERVICE_URL = process.env.SPRINT_SERVICE_URL ?? 'http://sprint-service:4003'
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:4004'
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL ?? 'http://file-service:4005'

// Auth service
app.use('/auth', proxyTo(AUTH_SERVICE_URL, '/auth'))

// Project service
app.use('/projects', proxyTo(PROJECT_SERVICE_URL, '/projects'))
app.use('/departments', proxyTo(PROJECT_SERVICE_URL, '/departments'))
app.use('/roles', proxyTo(PROJECT_SERVICE_URL, '/roles'))
app.use('/permissions', proxyTo(PROJECT_SERVICE_URL, '/permissions'))
app.use('/stakeholders', proxyTo(PROJECT_SERVICE_URL, '/stakeholders'))

// Sprint service
app.use('/sprints', proxyTo(SPRINT_SERVICE_URL, '/sprints'))
app.use('/cards', proxyTo(SPRINT_SERVICE_URL, '/cards'))
app.use('/tags', proxyTo(SPRINT_SERVICE_URL, '/tags'))
app.use('/time-entries', proxyTo(SPRINT_SERVICE_URL, '/time-entries'))
app.use('/audit', proxyTo(SPRINT_SERVICE_URL, '/audit'))

// Notification service
app.use('/notifications', proxyTo(NOTIFICATION_SERVICE_URL, '/notifications'))

// File service
app.use('/files', proxyTo(FILE_SERVICE_URL, '/files'))

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`api-gateway listening on :${PORT}`)
})
