const API_URL = (process.env.API_GATEWAY_INTERNAL_URL ?? 'http://api-gateway:4000').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 10_000

export interface GatewayError extends Error {
  status?: number
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string }
      message = parsed.message ?? parsed.error ?? body
    } catch {
      // corpo não é JSON — usa o texto bruto
    }
    const err = new Error(message || `${init.method ?? 'GET'} ${path} -> ${res.status}`) as GatewayError
    err.status = res.status
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
}

/** Cliente HTTP do api-gateway autenticado com o PAT do chamador. Nunca fala com Prisma/serviços de domínio diretamente (D2). */
export function gateway(token: string): Gateway {
  return {
    get: (path, params) => request(token, `${path}${toQueryString(params)}`),
    post: (path, body) => request(token, path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: (path, body) => request(token, path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
    delete: (path) => request(token, path, { method: 'DELETE' }),
  }
}
