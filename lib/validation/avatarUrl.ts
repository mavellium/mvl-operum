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

/** URL para exibição/navegação: aceita http(s) e caminhos locais, nunca HTML ou esquemas executáveis. */
export function safeAvatarUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  if (!/^(?:https?:\/\/[^\s<>"'`\\]+|\/(?![\/\\])[^\s<>"'`\\]*)$/i.test(value)) return undefined
  try {
    const parsed = new URL(value, 'https://avatar.invalid')
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    const href = value.startsWith('/') ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.href
    // Codifica metacaracteres no contexto URL, preservando query e escapes existentes do storage.
    return href.replace(/[<>"']/g, encodeURIComponent)
  } catch {
    return undefined
  }
}
