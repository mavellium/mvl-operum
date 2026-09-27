import { z } from 'zod'
import { UserError } from './errors.js'

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 200

export const paginationShape = {
  cursor: z.string().optional().describe('Cursor opaco devolvido em next_cursor pela chamada anterior.'),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe(`Itens por página (padrão ${DEFAULT_LIMIT}, máx. ${MAX_LIMIT}).`),
}

export interface Page<T> {
  items: T[]
  total: number
  next_cursor: string | null
}

function decodeCursor(cursor: string): number {
  const offset = Number(Buffer.from(cursor, 'base64url').toString('utf8'))
  if (!Number.isInteger(offset) || offset < 0) throw new UserError('cursor inválido — use o next_cursor devolvido pela chamada anterior.')
  return offset
}

/**
 * Paginação aplicada no mcp-server: os endpoints do Operum devolvem listas
 * inteiras, então o corte acontece aqui para manter as respostas pequenas.
 */
export function paginate<T>(items: T[], cursor?: string, limit = DEFAULT_LIMIT): Page<T> {
  const offset = cursor ? decodeCursor(cursor) : 0
  const slice = items.slice(offset, offset + limit)
  const nextOffset = offset + slice.length
  return {
    items: slice,
    total: items.length,
    next_cursor: nextOffset < items.length ? Buffer.from(String(nextOffset), 'utf8').toString('base64url') : null,
  }
}
