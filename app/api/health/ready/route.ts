import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 1500, query_timeout: 1500, idleTimeoutMillis: 1000 })
pool.on('error', () => {})
export async function GET() {
  const checks = await Promise.all([
    pool.query('SELECT 1').then(() => true, () => false),
    fetch(`${process.env.API_GATEWAY_INTERNAL_URL ?? 'http://api-gateway:4000'}/health/ready`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false),
    fetch(`http://${process.env.MINIO_ENDPOINT ?? 'minio'}:${process.env.MINIO_PORT ?? 9000}/minio/health/ready`, { signal: AbortSignal.timeout(2000) }).then(r => r.ok, () => false),
  ])
  const ready = checks.every(Boolean)
  return Response.json({ status: ready ? 'ready' : 'not ready' }, { status: ready ? 200 : 503 })
}
