import { verifyRouteSession } from '@/lib/routeAuth'
import { filesApi } from '@/lib/api-client'
import { isSafeStorageUrl } from '@/lib/storageUrl'

const CUID_RE = /^c[a-z0-9]{20,30}$/

/**
 * Abre um anexo de arquivo (SDD 4.2): confere a sessão e responde 302 para a
 * URL assinada do storage. É um link comum (<a href>), então o primeiro clique
 * abre; antes o modal pedia a URL a uma server action e só depois chamava
 * window.open, fora do clique, e o bloqueador de pop-up do navegador barrava.
 *
 * O file-service confere que o card é do tenant e que o anexo é desse card
 * (SDD 4.1). Anexo do tipo link não passa por aqui: a URL dele não é do storage
 * e a tela abre o link direto.
 */
export async function GET(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  let session: Awaited<ReturnType<typeof verifyRouteSession>>
  try { session = await verifyRouteSession(request) }
  catch { return Response.json({ error: 'Autenticação indisponível' }, { status: 503 }) }
  if (!session?.userId) return new Response('Não autorizado', { status: 401 })

  const { attachmentId } = await params
  const cardId = new URL(request.url).searchParams.get('cardId') ?? ''
  if (!CUID_RE.test(attachmentId) || !CUID_RE.test(cardId)) {
    return new Response('ID inválido', { status: 400 })
  }

  let url: string
  try {
    url = (await filesApi.getPresignedUrl(attachmentId, cardId)).url
  } catch {
    return new Response('Anexo não encontrado', { status: 404 })
  }

  if (!isSafeStorageUrl(url)) return new Response('Anexo não encontrado', { status: 404 })

  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })
}
