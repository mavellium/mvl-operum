/**
 * Card cujos responsáveis são todos membros inativos do projeto: continua com eles
 * (o histórico fica), mas precisa de outro responsável para ser concluído.
 */
export function precisaDeOutroResponsavel(responsavelIds: readonly string[], inativos: ReadonlySet<string>): boolean {
  return responsavelIds.length > 0 && responsavelIds.every(id => inativos.has(id))
}

export const MENSAGEM_RESPONSAVEL_INATIVO =
  'Responsável inativo no projeto: adicione outro responsável para concluir este card.'
