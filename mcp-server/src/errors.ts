import type { GatewayError } from './gateway.js'

export interface ToolErrorResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  isError: true
}

/**
 * Mapeia erros do gateway para uma mensagem acionável pelo modelo (SDD 6.5).
 * Nunca vaza stack trace nem URL interna.
 */
export function toToolError(err: unknown, entity?: string): ToolErrorResult {
  const status = (err as GatewayError | undefined)?.status
  let message: string

  switch (status) {
    case 401:
      message = 'Token inválido ou revogado. O usuário precisa gerar um novo em /perfil/tokens.'
      break
    case 403:
      message = 'Token sem permissão de escrita (escopo read).'
      break
    case 404:
      message = `${entity ?? 'Recurso'} não encontrado neste workspace.`
      break
    case 400:
    case 422:
      message = err instanceof Error ? err.message : 'Dados inválidos.'
      break
    default:
      message = 'Operum indisponível no momento, tente novamente.'
  }

  return { content: [{ type: 'text', text: message }], isError: true }
}
