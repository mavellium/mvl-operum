/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node CommonJS container */
// Docker socket is reachable only by this GET-only, project-scoped proxy.
const http = require('node:http')
const project = process.env.DOCKER_FILTER_PROJECT
if (!project) throw new Error('Docker project scope required')
let ids = new Set()
const call = path => new Promise((resolve, reject) => {
  const request = http.get({ socketPath: '/var/run/docker.sock', path }, response => {
    let body = ''
    response.on('data', chunk => { body += chunk; if (body.length > 4e6) request.destroy(new Error('Too large')) })
    response.on('end', () => resolve({ status: response.statusCode, body, apiVersion: response.headers['api-version'] }))
  })
  request.setTimeout(3000, () => request.destroy(new Error('Timeout')))
  request.on('error', reject)
})
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://internal')
  const path = url.pathname.replace(/^\/v\d+\.\d+/, '')
  if (req.method !== 'GET' && !(req.method === 'HEAD' && path === '/_ping')) { res.writeHead(403).end(); return }
  try {
    if (path === '/containers/json' || path === '/networks') {
      const filters = encodeURIComponent(JSON.stringify({ label: [`com.docker.compose.project=${project}`] }))
      const result = await call(`${path}?filters=${filters}`)
      const containers = JSON.parse(result.body)
      if (path === '/containers/json') ids = new Set(containers.map(c => c.Id))
      res.writeHead(result.status, { 'Content-Type': 'application/json' }).end(result.body)
    } else if (path === '/version' || path === '/_ping') {
      const result = await call(path)
      if (result.apiVersion) res.setHeader('Api-Version', result.apiVersion)
      res.writeHead(result.status).end(result.body)
    } else {
      const inspect = /^\/containers\/([a-f0-9]{64})\/json$/.exec(path)
      if (inspect && ids.has(inspect[1])) {
        const result = await call(path)
        const data = JSON.parse(result.body)
        // Docker SDK needs TTY/log-driver metadata, never environment or mounts.
        res.writeHead(result.status, { 'Content-Type': 'application/json' }).end(JSON.stringify({
          Id: data.Id, Name: data.Name, Config: { Tty: data.Config?.Tty },
          HostConfig: { LogConfig: { Type: data.HostConfig?.LogConfig?.Type } },
          State: { Running: data.State?.Running, StartedAt: data.State?.StartedAt, FinishedAt: data.State?.FinishedAt },
        }))
        return
      }
      const match = /^\/containers\/([a-f0-9]{64})\/logs$/.exec(path)
      if (!match || !ids.has(match[1])) { res.writeHead(403).end(); return }
      // Only logs for a container discovered in this project; no inspect/env/exec.
      const request = http.get({ socketPath: '/var/run/docker.sock', path: path + url.search }, response => {
        res.writeHead(response.statusCode, { 'Content-Type': 'application/vnd.docker.raw-stream' })
        response.pipe(res)
      })
      request.on('error', () => res.destroy())
      res.on('close', () => request.destroy())
    }
  } catch { res.writeHead(503).end() }
}).listen(2375, '0.0.0.0')
