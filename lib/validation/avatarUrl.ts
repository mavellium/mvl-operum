/**
 * Valida uma URL de avatar/logo antes de persistir.
 * Bloqueia esquemas perigosos (javascript:, data:, file:) e exige http(s).
 * Lança se a URL for inválida; retorna undefined se `url` for undefined/vazio.
 */
export function validateAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('URL de avatar inválida')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('URL de avatar inválida')
  }

  return trimmed
}
