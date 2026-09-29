const API_URL = (process.env.API_GATEWAY_INTERNAL_URL ?? 'http://api-gateway:4000').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 10_000
/** Upload de anexo (até 50 MB) passa pelo gateway até o file-service e o MinIO. */
const UPLOAD_TIMEOUT_MS = 120_000

const MAX_PUBLIC_MESSAGE_CHARS = 300

export interface GatewayError extends Error {
  status?: number
  /**
   * Mensagem segura para devolver ao modelo: só existe quando veio do campo
   * `message`/`error` (string) de um corpo JSON do serviço — nunca texto bruto,
   * HTML de proxy ou o fallback com método/path interno.
   */
  publicMessage?: string
}

async function request<T>(token: string, path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  // FormData: o fetch monta o Content-Type multipart com o boundary.
  const isForm = init.body instanceof FormData
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body
    let publicMessage: string | undefined
    try {
      const parsed = JSON.parse(body) as { message?: unknown; error?: unknown }
      const candidate = typeof parsed.message === 'string' ? parsed.message : typeof parsed.error === 'string' ? parsed.error : undefined
      if (candidate) {
        message = candidate
        publicMessage = candidate.slice(0, MAX_PUBLIC_MESSAGE_CHARS)
      }
    } catch {
      // corpo não é JSON — usa o texto bruto só para log interno
    }
    const err = new Error(message || `${init.method ?? 'GET'} ${path} -> ${res.status}`) as GatewayError
    err.status = res.status
    err.publicMessage = publicMessage
    throw err
  }

  return res.json() as Promise<T>
}

function toQueryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][]
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}

export interface Gateway {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) => Promise<T>
  post: <T>(path: string, body?: unknown) => Promise<T>
  patch: <T>(path: string, body?: unknown) => Promise<T>
  delete: <T>(path: string) => Promise<T>
  /** POST multipart/form-data (upload de anexo), com prazo maior. */
  upload: <T>(path: string, form: FormData) => Promise<T>
}

/** Cliente HTTP do api-gateway autenticado com o PAT do chamador. Nunca fala com Prisma/serviços de domínio diretamente (D2). */
export function gateway(token: string): Gateway {
  return {
    get: (path, params) => request(token, `${path}${toQueryString(params)}`),
    post: (path, body) => request(token, path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: (path, body) => request(token, path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
    delete: (path) => request(token, path, { method: 'DELETE' }),
    upload: (path, form) => request(token, path, { method: 'POST', body: form }, UPLOAD_TIMEOUT_MS),
  }
}
