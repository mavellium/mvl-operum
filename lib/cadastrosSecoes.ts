/** Seções de Cadastros Globais: cada uma tem o próprio endereço, para o menu abrir direto nela. */
export const SECOES_CADASTROS = ['departamentos', 'funcoes'] as const
export type SecaoCadastros = (typeof SECOES_CADASTROS)[number]

export function hrefCadastros(secao: SecaoCadastros): string {
  return `/admin/cadastros/${secao}`
}
