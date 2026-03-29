import { z } from 'zod'

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileType: z.enum(ALLOWED_MIME_TYPES, {
    error: `Tipo de arquivo não permitido. Use: ${ALLOWED_MIME_TYPES.join(', ')}`,
  }),
  fileSize: z.number().max(MAX_FILE_SIZE, 'Arquivo excede o tamanho máximo de 10 MB'),
})

export type FileUploadInput = z.infer<typeof FileUploadSchema>
