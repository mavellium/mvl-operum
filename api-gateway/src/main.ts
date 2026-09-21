import 'dotenv/config'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from './middleware/auth'

const app = express()

app.use(
  rateLimit({
    windowMs: 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  }),
)

app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-ID,X-Internal-Api-Key')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use(authMiddleware())

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ''

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://auth-service:4001'
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL ?? 'http://project-service:4002'
const SPRINT_SERVICE_URL = process.env.SPRINT_SERVICE_URL ?? 'http://sprint-service:4003'
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:4004'
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL ?? 'http://file-service:4005'

function makeProxy(targetUrl: string, prefix: string) {
  return createProxyMiddleware({ target: targetUrl, changeOrigin: true, pathRewrite: { '^/': `${prefix}/` }, on: { proxyReq: (proxyReq) => proxyReq.setHeader('X-Internal-Api-Key', INTERNAL_API_KEY) } })
}

const proxyRoutes = [
  { context: '/auth', target: AUTH_SERVICE_URL },
  { context: '/projects', target: PROJECT_SERVICE_URL },
  { context: '/departments', target: PROJECT_SERVICE_URL },
  { context: '/roles', target: PROJECT_SERVICE_URL },
  { context: '/permissions', target: PROJECT_SERVICE_URL },
  { context: '/stakeholders', target: PROJECT_SERVICE_URL },
  { context: '/sprints', target: SPRINT_SERVICE_URL },
  { context: '/cards', target: SPRINT_SERVICE_URL },
  { context: '/tags', target: SPRINT_SERVICE_URL },
  { context: '/time-entries', target: SPRINT_SERVICE_URL },
  { context: '/audit', target: SPRINT_SERVICE_URL },
  { context: '/notifications', target: NOTIFICATION_SERVICE_URL },
  { context: '/files', target: FILE_SERVICE_URL },
]

for (const { context, target } of proxyRoutes) {
  const proxy = makeProxy(target, context)
  app.use(context, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    proxy(req, res, next)
  })
}

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => { console.log(`api-gateway listening on :${PORT}`) })
