/**
 * Tipos aceitos como anexo de card: MIME → extensão gravada no MinIO.
 * O file-service tem a mesma tabela em `file-service/src/upload/attachment-types.ts`
 * (o teste de paridade em __tests__/unit/lib/attachmentTypes.test.ts garante).
 * SVG e HTML ficam de fora de propósito: executariam script ao abrir o link.
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

export const ATTACHMENT_TYPES_LABEL =
  'imagens, vídeos (MP4, WebM, MOV), PDF, Word, Excel, PowerPoint, OpenDocument, TXT, CSV ou ZIP'

/** Extensão → MIME. A primeira entrada de cada extensão vence (.zip → application/zip). */
const MIME_BY_EXT: Record<string, string> = { '.jpeg': 'image/jpeg' }
for (const [mime, ext] of Object.entries(ATTACHMENT_EXT_BY_MIME)) {
  if (!(ext in MIME_BY_EXT)) MIME_BY_EXT[ext] = mime
}

/** Valor do atributo `accept` do input de arquivo: MIMEs (ajudam no celular) e extensões. */
export const ATTACHMENT_ACCEPT = [...Object.keys(ATTACHMENT_EXT_BY_MIME), ...Object.keys(MIME_BY_EXT)].join(',')

export function extensaoDe(nome: string): string {
  const i = nome.lastIndexOf('.')
  return i > 0 ? nome.slice(i).toLowerCase() : ''
}

/**
 * MIME com que o anexo é enviado ao file-service. A extensão tem precedência
 * porque o navegador às vezes manda o tipo vazio (.mov no Linux) ou trocado
 * (.csv como application/vnd.ms-excel no Windows).
 */
export function tipoDoAnexo(file: { name: string; type: string }): string | null {
  const porExtensao = MIME_BY_EXT[extensaoDe(file.name)]
  if (porExtensao) return porExtensao
  return Object.hasOwn(ATTACHMENT_EXT_BY_MIME, file.type) ? file.type : null
}

/** Mensagem para o usuário quando o arquivo não pode ser anexado; `null` se pode. */
export function erroDoAnexo(file: { name: string; type: string; size: number }): string | null {
  if (!tipoDoAnexo(file)) {
    const ext = extensaoDe(file.name)
    return `Tipo de arquivo não aceito${ext ? ` (${ext})` : ''}. Envie ${ATTACHMENT_TYPES_LABEL}.`
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1).replace('.', ',')
    return `"${file.name}" tem ${mb} MB. O limite é ${MAX_ATTACHMENT_MB} MB.`
  }
  return null
}

/** Anexo que é só um link (vídeo do YouTube etc.): filePath guarda a URL, sem arquivo no MinIO. */
export const LINK_ATTACHMENT_TYPE = 'text/uri-list'
export const MAX_LINK_URL_LENGTH = 2048

export function isLinkAttachment(fileType: string): boolean {
  return fileType === LINK_ATTACHMENT_TYPE
}

/** URL do link só se for http(s): nada de `javascript:` vindo do banco num href. */
export function linkHref(filePath: string): string | null {
  try {
    const url = new URL(filePath)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function linkHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
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

/** Miniatura do vídeo (só YouTube, servida por i.ytimg.com, liberado no CSP). */
export function linkThumbnail(href: string): string | null {
  const id = youtubeVideoId(href)
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null
}
