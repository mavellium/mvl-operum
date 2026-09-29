/**
 * Tipos aceitos como anexo de card: MIME → extensão. Espelho de
 * `lib/attachmentTypes.ts` do app e de `file-service/src/upload/attachment-types.ts`
 * (o teste de paridade do app compara as três). O file-service valida de novo;
 * aqui é para recusar antes de baixar/enviar e explicar o motivo ao modelo.
 */
export const ATTACHMENT_EXT_BY_MIME: Record<string, string> = {
  // Imagens
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  // Vídeos
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  // Documentos
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/msword': '.doc',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'text/plain': '.txt',
  'text/csv': '.csv',
  // Compactados (o Windows manda o ZIP como x-zip-compressed)
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
}

export const MAX_ATTACHMENT_MB = 50
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024

/** content_base64 viaja dentro da chamada JSON-RPC: limite menor que o do file-service. */
export const MAX_BASE64_MB = 10
export const MAX_BASE64_BYTES = MAX_BASE64_MB * 1024 * 1024

/** Anexo que é só um link (vídeo do YouTube etc.): filePath guarda a URL, sem arquivo no MinIO. */
export const LINK_ATTACHMENT_TYPE = 'text/uri-list'
export const MAX_LINK_URL_LENGTH = 2048

export const ACCEPTED_TYPES_LABEL =
  'imagens (PNG, JPG, WebP, GIF), vídeos (MP4, WebM, MOV), PDF, Word, Excel, PowerPoint, OpenDocument, TXT, CSV e ZIP'

const MIME_BY_EXT: Record<string, string> = { '.jpeg': 'image/jpeg' }
for (const [mime, ext] of Object.entries(ATTACHMENT_EXT_BY_MIME)) {
  if (!(ext in MIME_BY_EXT)) MIME_BY_EXT[ext] = mime
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i).toLowerCase() : ''
}

function accepted(mime: string | undefined): mime is string {
  return !!mime && Object.prototype.hasOwnProperty.call(ATTACHMENT_EXT_BY_MIME, mime)
}

/**
 * MIME do anexo: extensão do nome > mime_type informado > Content-Type da URL.
 * Mesma precedência do app (o navegador e o modelo erram o tipo; a extensão
 * é o que o usuário vê e o que define como o arquivo abre).
 */
export function resolveMime(fileName: string, ...declared: (string | undefined)[]): string | null {
  const byExt = MIME_BY_EXT[extOf(fileName)]
  if (byExt) return byExt
  for (const d of declared) {
    const mime = d?.split(';')[0].trim().toLowerCase()
    if (accepted(mime)) return mime
  }
  return null
}

/** Nome aceito pelo file-service (sem / \ : * ? " < > | nem controle) e com a extensão do tipo. */
export function safeFileName(raw: string, mime: string): string {
  let name = raw.replace(/[/\\:*?"<>|\x00-\x1f\x7f]+/g, '-').replace(/\s+/g, ' ').trim()
  if (!name || name === '.' || name === '..') name = 'arquivo'
  const ext = ATTACHMENT_EXT_BY_MIME[mime]
  if (!MIME_BY_EXT[extOf(name)]) name = `${name}${ext}`
  if (name.length > 255) name = `${name.slice(0, 255 - ext.length)}${ext}`
  return name
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

/** Id do vídeo em youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ e /live/. */
export function youtubeVideoId(href: string): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ?? null)
  }
  return id && YOUTUBE_ID_RE.test(id) ? id : null
}
