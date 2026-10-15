/**
 * Card precisa de responsável a partir de "Em andamento" (pedido de 15/10, ADR-045).
 * Até "A Fazer" pode ficar sem. Espelho de `lib/responsavelObrigatorio.ts` do app.
 */
export interface ColunaPos { id: string; title: string; position: number }

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/**
 * A coluna exige responsável quando está em "Em andamento" ou depois dela. Sem uma
 * coluna "Em andamento" na sprint, vale toda coluna depois da primeira.
 */
export function colunaExigeResponsavel(colunas: readonly ColunaPos[], columnId: string): boolean {
  const alvo = colunas.find(c => c.id === columnId)
  if (!alvo) return false
  const emAndamento = colunas.find(c => normalizar(c.title) === 'em andamento')
  if (emAndamento) return alvo.position >= emAndamento.position
  const primeira = Math.min(...colunas.map(c => c.position))
  return alvo.position > primeira
}

export const mensagemSemResponsavel = (coluna: string) =>
  `Defina um responsável antes de mover o card para "${coluna}".`

export const mensagemUltimoResponsavel = (coluna: string) =>
  `O card está em "${coluna}" e precisa de pelo menos um responsável. Adicione outro antes de remover este.`
