import { verifyRouteSession } from '@/lib/routeAuth'
import { filesApi } from '@/lib/api-client'

const CUID_RE = /^c[a-z0-9]{20,30}$/
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// Must be set — fail closed if missing to prevent SSRF via unconfigured origin
const MINIO_PUBLIC_URL = (process.env.MINIO_PUBLIC_URL ?? '').replace(/\/$/, '')

function isSafePresignedUrl(rawUrl: string): boolean {
  if (!MINIO_PUBLIC_URL) return false
  let url: URL
  let allowed: URL
  try {
    url = new URL(rawUrl)
    allowed = new URL(MINIO_PUBLIC_URL)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.hostname !== allowed.hostname) return false
  if (allowed.port && url.port !== allowed.port) return false
  return true
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) return new Response('Não autorizado', { status: 401 })

  const { attachmentId } = await params
  if (!CUID_RE.test(attachmentId)) return new Response('ID inválido', { status: 400 })

  let presignedUrl: string
  try {
    const result = await filesApi.getPresignedUrl(attachmentId)
    presignedUrl = result.url
  } catch {
    return new Response('Anexo não encontrado', { status: 404 })
  }

  if (!isSafePresignedUrl(presignedUrl)) {
    return new Response('URL de origem não autorizada', { status: 400 })
  }

  let imageRes: Response
  try {
    imageRes = await fetch(presignedUrl)
  } catch {
    return new Response('Erro ao buscar imagem', { status: 502 })
  }

  if (!imageRes.ok) return new Response('Imagem não encontrada', { status: 404 })

  // Validate content-type against allowlist — never forward user/S3-controlled value as-is
  const rawType = imageRes.headers.get('content-type') ?? ''
  const contentType = rawType.split(';')[0].trim().toLowerCase()
  if (!ALLOWED_TYPES.has(contentType)) {
    return new Response('Tipo de arquivo não permitido', { status: 415 })
  }

  const buffer = await imageRes.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
