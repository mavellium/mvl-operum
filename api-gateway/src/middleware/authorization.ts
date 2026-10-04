import type { Request, Response, NextFunction } from 'express'

const protectedRoots = new Set(['projects','sprints','cards','time-entries','files','stakeholders','roles','permissions','departments','tags','audit'])

export function authorizationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    delete req.headers['x-authorized-projects']
    delete req.headers['x-redact-project-documents']
    let root: string
    try { root = decodeURIComponent(req.path).toLowerCase().split('/').filter(Boolean)[0] } catch { return res.status(400).json({ error: 'Caminho inválido' }) }
    if (!protectedRoots.has(root)) return next()
    const userId = req.headers['x-user-id']
    const tenantId = req.headers['x-tenant-id']
    if (!userId || !tenantId) return res.status(401).json({ error: 'Não autorizado' })
    try {
      const response = await fetch(`${process.env.AUTHORIZATION_SERVICE_URL ?? 'http://localhost:3000'}/api/internal/authorize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY ?? '' },
        body: JSON.stringify({ userId, tenantId, method: req.method, path: req.originalUrl, body: req.body }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return res.status(response.status === 403 ? 403 : 503).json({ error: response.status === 403 ? 'Sem permissão para esta operação' : 'Autorização indisponível' })
      const access = await response.json() as { allowed?: boolean; projectIds?: string[]; redactDocuments?: boolean }
      if (access.allowed !== true) return res.status(403).json({ error: 'Sem permissão para esta operação' })
      if (access.projectIds !== undefined) {
        if (!Array.isArray(access.projectIds) || !access.projectIds.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id))) throw new Error('Resposta inválida')
        req.headers['x-authorized-projects'] = access.projectIds.join(',') || '-'
      }
      if (access.redactDocuments === true) req.headers['x-redact-project-documents'] = 'true'
      next()
    } catch { return res.status(503).json({ error: 'Autorização indisponível' }) }
  }
}
