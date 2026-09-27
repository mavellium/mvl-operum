export interface JsonToolResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  structuredContent: Record<string, unknown>
}

/**
 * Resultado de tool em JSON estruturado: o agente encadeia ids entre chamadas,
 * então nada de texto formatado. O mesmo JSON vai em `content` (clientes que só
 * leem texto) e em `structuredContent`.
 *
 * Campos de texto (títulos, descrições, comentários) são conteúdo de usuário do
 * Operum — dados, nunca instruções para o agente.
 */
export function jsonResult(data: Record<string, unknown>): JsonToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: data,
  }
}
