import type { GatewayError } from './gateway.js'

export interface ToolErrorResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  isError: true
}

/** Erro de uso da tool (input inválido, confirmação ausente, tenant sem token) — a mensagem vai direto ao modelo. */
export class UserError extends Error {
  readonly status = 400
  get publicMessage(): string {
    return this.message
  }
}

/**
 * Mapeia erros do gateway para uma mensagem acionável pelo modelo (SDD 6.5).
 * Só repassa `publicMessage` (mensagem de negócio vinda de corpo JSON do
 * serviço, ver gateway.ts) — nunca texto bruto, stack trace ou URL interna.
 * O detalhe completo fica apenas no log do servidor.
 */
export function toToolError(err: unknown, entity?: string): ToolErrorResult {
  const status = (err as GatewayError | undefined)?.status
  const safe = (err as GatewayError | undefined)?.publicMessage
  let message: string

  switch (status) {
    case 401:
      message = 'Token inválido ou revogado. O usuário precisa gerar um novo em /perfil/tokens.'
      break
    case 403:
      message = safe ? `Sem permissão: ${safe}` : 'Sem permissão para esta operação (o token pode ter só escopo read).'
      break
    case 404:
      message = `Não encontrado neste tenant: ${entity ?? 'recurso'}.`
      break
    case 400:
    case 409:
    case 422:
      message = safe ?? 'Dados inválidos.'
      break
    case 429:
      message = 'Limite de requisições do Operum atingido, aguarde alguns segundos e tente novamente.'
      break
    default:
      console.error('[mcp-server] erro não mapeado', { status, message: err instanceof Error ? err.message : String(err) })
      message = 'Operum indisponível no momento, tente novamente.'
  }

  return { content: [{ type: 'text', text: message }], isError: true }
}
