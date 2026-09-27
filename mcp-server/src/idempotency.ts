const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 5000

// Em memória: vale enquanto houver uma única réplica do mcp-server (deploy
// atual). Com mais réplicas, mover para Redis.
const store = new Map<string, { expires: number; promise: Promise<unknown> }>()

export function clearIdempotencyStore(): void {
  store.clear()
}

/**
 * Garante que a mesma `key` (por token) execute `fn` uma única vez em 24h.
 * Chamadas repetidas — inclusive concorrentes — recebem o mesmo resultado.
 * Falhas não são memorizadas, para permitir nova tentativa.
 */
export async function withIdempotency<T>(
  scope: string,
  key: string | undefined,
  fn: () => Promise<T>,
): Promise<{ result: T; replayed: boolean }> {
  if (!key) return { result: await fn(), replayed: false }

  const now = Date.now()
  // Map itera em ordem de inserção = ordem de expiração (TTL fixo): remove do
  // mais antigo até achar uma entrada válida com espaço sobrando.
  for (const [k, v] of store) {
    if (v.expires > now && store.size < MAX_ENTRIES) break
    store.delete(k)
  }

  const fullKey = `${scope}:${key}`
  const existing = store.get(fullKey)
  if (existing && existing.expires > now) return { result: (await existing.promise) as T, replayed: true }

  const promise = fn()
  store.set(fullKey, { expires: now + TTL_MS, promise })
  try {
    return { result: await promise, replayed: false }
  } catch (err) {
    store.delete(fullKey)
    throw err
  }
}
