import { connect } from 'node:net'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 1500, query_timeout: 1500, idleTimeoutMillis: 1000 })
pool.on('error', () => {})
export async function databaseReady(): Promise<boolean> {
  try { await pool.query('SELECT 1'); return true } catch { return false }
}
export async function httpReady(url: string): Promise<boolean> {
  try { return (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok } catch { return false }
}
export function redisReady(host: string): Promise<boolean> {
  return new Promise(resolve => {
    const socket = connect({ host, port: 6379 })
    let received = ''
    const finish = (ok: boolean) => { socket.destroy(); resolve(ok) }
    socket.setTimeout(2000, () => finish(false))
    socket.on('error', () => finish(false))
    socket.on('end', () => finish(false))
    socket.on('connect', () => {
      const command = (parts: string[]) => `*${parts.length}\r\n` + parts.map(p => `$${Buffer.byteLength(p)}\r\n${p}\r\n`).join('')
      const password = process.env.REDIS_PASSWORD
      socket.write((password ? command(['AUTH', password]) : '') + command(['PING']))
    })
    socket.on('data', data => {
      received += data.toString()
      if (received.startsWith('-') || received.includes('\r\n-')) finish(false)
      else if (received.includes('+PONG\r\n')) finish(true)
    })
  })
}
