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

/**
 * Chave de equivalência de nomes de função (cargo). Não é gravada no banco:
 * serve para detectar duplicatas que o `nameKey` não pega, como
 * "Gerente de Projeto" × "Gerente de Projetos" × "gerente  de projéto".
 * Minúsculas, sem acento, espaços colapsados e plural simples removido por palavra.
 */
export function funcaoKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizar)
    .join(' ')
}

function singularizar(palavra: string): string {
  if (palavra.length <= 3) return palavra
  // professores → professor, raizes → raiz
  if (/[rz]es$/.test(palavra)) return palavra.slice(0, -2)
  if (palavra.endsWith('s') && !palavra.endsWith('ss')) return palavra.slice(0, -1)
  return palavra
}
