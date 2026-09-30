/**
 * URL assinada do storage (MinIO) que pode ser seguida pelo servidor ou
 * mandada ao navegador: só http(s) e só o host de MINIO_PUBLIC_URL. Sem a
 * variável, falha fechado. Evita redirecionar para, ou buscar no servidor,
 * uma URL qualquer vinda do banco (ex.: o link de um anexo do tipo link).
 */
export function isSafeStorageUrl(rawUrl: string, publicUrl = process.env.MINIO_PUBLIC_URL ?? ''): boolean {
  const base = publicUrl.replace(/\/$/, '')
  if (!base) return false
  let url: URL
  let allowed: URL
  try {
    url = new URL(rawUrl)
    allowed = new URL(base)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.protocol !== allowed.protocol) return false
  if (url.hostname !== allowed.hostname) return false
  if (url.port !== allowed.port) return false
  return true
}
