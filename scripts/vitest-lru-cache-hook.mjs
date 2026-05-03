// ESM loader hook — replaces lru-cache/dist/esm (which has top-level await)
// with a minimal CJS-compatible Map-backed stub.
// Also handles nested empty lru-cache under @asamuzakjp packages.
// Registered by vitest-jsdom-patch.cjs via module.register().

const LRU_ESM_RE = /lru-cache[^/]*\/dist\/esm\//
const SYNTHETIC_LRU = 'file:///vitest-lru-cache-nested-stub.mjs'

const LRU_STUB = `
export class LRUCache {
  #cache = new Map()
  constructor(_opts) {}
  get(key) { return this.#cache.get(key) }
  set(key, value) { this.#cache.set(key, value); return this }
  has(key) { return this.#cache.has(key) }
  delete(key) { return this.#cache.delete(key) }
  clear() { this.#cache.clear() }
  get size() { return this.#cache.size }
  [Symbol.iterator]() { return this.#cache.entries() }
}
`

export async function resolve(specifier, context, nextResolve) {
  // @asamuzakjp packages bundle an empty nested lru-cache that causes
  // ERR_MODULE_NOT_FOUND. Redirect to a synthetic URL handled by load().
  if (specifier === 'lru-cache' && context.parentURL?.includes('@asamuzakjp')) {
    return { shortCircuit: true, url: SYNTHETIC_LRU }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (LRU_ESM_RE.test(url) || url === SYNTHETIC_LRU) {
    return { shortCircuit: true, format: 'module', source: LRU_STUB }
  }
  return nextLoad(url, context)
}
