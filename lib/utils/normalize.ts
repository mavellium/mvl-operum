/**
 * Normalizes a name for storage and deduplication.
 * - `nome`: trimmed original (preserves case) — kept for call-site compatibility
 * - `nomeKey`: lowercase slug used for case-insensitive uniqueness checks — kept for call-site compatibility
 */
export function normalizeNome(name: string): { nome: string; nomeKey: string } {
  const nome = name.trim()
  const nomeKey = nome.toLowerCase()
  return { nome, nomeKey }
}
