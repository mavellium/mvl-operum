// ESM loader hook — replaces lru-cache/dist/esm (which has top-level await)
// with a minimal CJS-compatible Map-backed stub.
// Registered by vitest-jsdom-patch.cjs via module.register().

const LRU_ESM_RE = /lru-cache[^/]*\/dist\/esm\//

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

export async function load(url, context, nextLoad) {
  if (LRU_ESM_RE.test(url)) {
    return { shortCircuit: true, format: 'module', source: LRU_STUB }
  }
  return nextLoad(url, context)
}
