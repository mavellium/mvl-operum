import type { Gateway, GatewayError } from '../gateway.js'

export interface ThrottleOptions {
  /** Requisições por segundo (padrão: OPERUM_MCP_RPS ou 12). O gateway limita 20 req/s por PAT — fica abaixo com folga. */
  rps?: number
  maxRetries?: number
  baseDelayMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function isRetryable(method: string, err: unknown): boolean {
  const status = (err as GatewayError | undefined)?.status
  // 429: rejeitado antes de processar — seguro repetir qualquer método.
  if (status === 429) return true
  // POST não é idempotente: um timeout/5xx pode ter criado o recurso. Não repete.
  if (method === 'POST') return false
  return status === undefined || status === 502 || status === 503 || status === 504
}

/**
 * Envolve o Gateway com limite de taxa e retry com backoff exponencial, para
 * operações longas (export/import) que fazem centenas de chamadas.
 */
export function throttledGateway(gw: Gateway, opts: ThrottleOptions = {}): Gateway {
  const interval = 1000 / (opts.rps ?? (Number(process.env.OPERUM_MCP_RPS) || 12))
  const maxRetries = opts.maxRetries ?? 4
  const baseDelay = opts.baseDelayMs ?? 500
  const sleep = opts.sleep ?? defaultSleep
  let nextSlot = 0

  async function slot(): Promise<void> {
    const now = Date.now()
    const wait = Math.max(0, nextSlot - now)
    nextSlot = Math.max(now, nextSlot) + interval
    if (wait > 0) await sleep(wait)
  }

  async function call<T>(method: string, fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await slot()
      try {
        return await fn()
      } catch (err) {
        if (attempt >= maxRetries || !isRetryable(method, err)) throw err
        await sleep(baseDelay * 2 ** attempt)
      }
    }
  }

  return {
    get: (path, params) => call('GET', () => gw.get(path, params)),
    post: (path, body) => call('POST', () => gw.post(path, body)),
    patch: (path, body) => call('PATCH', () => gw.patch(path, body)),
    delete: path => call('DELETE', () => gw.delete(path)),
  }
}
