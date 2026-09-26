import 'dotenv/config'
import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { buildServer } from './server.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

const PAT_PREFIX = 'opr_pat_'

app.post('/mcp', async (req, res) => {
  const auth = req.headers.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token.startsWith(PAT_PREFIX)) {
    res.status(401).set('WWW-Authenticate', 'Bearer realm="operum"').end()
    return
  }

  const server = buildServer(token)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => {
    transport.close()
    server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

// Stateless (D3): GET/DELETE em /mcp não são suportados — sem sessão para retomar/fechar.
app.all('/mcp', (_req, res) => res.status(405).end())

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 4006)
app.listen(PORT, () => { console.log(`mcp-server listening on :${PORT}`) })
