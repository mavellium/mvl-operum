import { randomUUID } from 'node:crypto'
const counts = new Map<string, number>()
const durations = new Map<string, number>()
export function requestId(value: unknown): string {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value) ? value : randomUUID()
}
export function observe(method: string, status: number, seconds: number) {
  const safeMethod = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) ? method : 'OTHER'
  const key = `method="${safeMethod}",status="${Math.floor(status / 100)}xx"`
  counts.set(key, (counts.get(key) ?? 0) + 1)
  durations.set(key, (durations.get(key) ?? 0) + seconds)
}
export function metrics(): string {
  let output = '# TYPE operum_http_requests_total counter\n'
  for (const [key, value] of counts) output += `operum_http_requests_total{${key}} ${value}\n`
  output += '# TYPE operum_http_duration_seconds_total counter\n'
  for (const [key, value] of durations) output += `operum_http_duration_seconds_total{${key}} ${value}\n`
  output += `# TYPE operum_process_uptime_seconds gauge\noperum_process_uptime_seconds ${process.uptime()}\n`
  return output
}
export function telemetry(req: { headers: Record<string, unknown>; method: string }, res: { statusCode: number; setHeader: (key: string, value: string) => void; on: (event: string, listener: () => void) => void }, next: () => void) {
  const id = requestId(req.headers['x-request-id'])
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  const started = performance.now()
  res.on('finish', () => {
    const seconds = (performance.now() - started) / 1000
    observe(req.method, res.statusCode, seconds)
    // No URL, payload, cookies, credentials or identity in operational logs.
    console.log(JSON.stringify({ event: 'http', requestId: id, method: req.method, status: res.statusCode, durationMs: Math.round(seconds * 1000) }))
  })
  next()
}
