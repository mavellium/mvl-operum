import type { Permissao } from './permissoes'

export const CAMPOS_REALIZADO = new Set(['tempoRealMinutos', 'materiaisReal', 'dataRealizacao', 'percentualConclusao'])
export const CAMPOS_ORCADO = new Set(['tempoMinutos', 'materiais', 'dataPrevista', 'elaboradoPorUserId', 'elaboradoPor', 'cost', 'durationDays', 'dataLimite', 'custo'])

export function podeEditarRealizado(permissoes: ReadonlySet<Permissao>, userId: string, elaboradoPorUserId: unknown) {
  return permissoes.has('planilha:realizado-todos') || (permissoes.has('planilha:realizado-proprio') && elaboradoPorUserId === userId)
}

/** Usa o responsável persistido, nunca o enviado junto ao patch. */
export function validarCamposCustos(permissoes: ReadonlySet<Permissao>, userId: string, atuais: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const campo of Object.keys(patch)) {
    const permitido = CAMPOS_REALIZADO.has(campo)
      ? podeEditarRealizado(permissoes, userId, atuais.elaboradoPorUserId)
      : CAMPOS_ORCADO.has(campo) ? permissoes.has('planilha:orcado') : permissoes.has('projeto:editar')
    if (!permitido) throw new Error(`Sem permissão para editar o campo ${campo}.`)
  }
}
