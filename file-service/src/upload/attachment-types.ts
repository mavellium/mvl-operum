/**
 * Tipos aceitos como anexo de card: MIME → extensão gravada no MinIO.
 * Espelho de `lib/attachmentTypes.ts` do app (o teste de paridade de lá garante).
 * Lista explícita: a extensão nunca vem do nome enviado pelo usuário.
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
export const MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_MB * 1024 * 1024
