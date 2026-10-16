/**
 * Regras dos lançamentos de tempo (cards de 16/10, ADR-046). Um timer esquecido
 * contou 312h45 em 13 dias; lançamentos manuais aceitavam sobreposição e qualquer
 * duração; e não havia como editar um lançamento.
 */
export const LIMITE_HORAS = 12
export const LIMITE_SEGUNDOS = LIMITE_HORAS * 3600
/** Marca na descrição de um timer encerrado sozinho no limite: pede revisão do dono. */
export const MARCA_REVISAO = `[Revisar] Timer encerrado no limite de ${LIMITE_HORAS} h.`
/** Folga para relógios levemente adiantados ao lançar algo que acabou de terminar. */
const FOLGA_FUTURO_MS = 60_000

export interface Intervalo { inicio: Date; fim: Date }

/** Mensagem de erro, ou null se o intervalo é aceitável para um lançamento. */
export function erroDoIntervalo({ inicio, fim }: Intervalo, agora: Date): string | null {
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 'Início e fim devem ser datas válidas.'
  if (fim <= inicio) return 'O fim deve ser depois do início.'
  if (fim.getTime() > agora.getTime() + FOLGA_FUTURO_MS) return 'O fim não pode estar no futuro.'
  if (fim.getTime() - inicio.getTime() > LIMITE_SEGUNDOS * 1000) return `Um lançamento pode ter no máximo ${LIMITE_HORAS} h. Divida em mais de um.`
  return null
}

export interface Existente { id: string; startedAt: Date; endedAt: Date | null; isRunning: boolean; cardTitle?: string | null }

/** Primeiro lançamento do mesmo usuário que se sobrepõe ao intervalo (timer rodando vai até agora). */
export function conflito(intervalo: Intervalo, existentes: readonly Existente[], agora: Date, ignorar?: string): Existente | null {
  for (const e of existentes) {
    if (e.id === ignorar) continue
    const fim = e.isRunning || !e.endedAt ? agora : e.endedAt
    if (e.startedAt < intervalo.fim && intervalo.inicio < fim) return e
  }
  return null
}

const hora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function mensagemConflito(e: Existente): string {
  const fim = e.isRunning || !e.endedAt ? 'agora (timer rodando)' : hora(e.endedAt)
  return `Já existe um lançamento seu de ${hora(e.startedAt)} a ${fim}${e.cardTitle ? ` em "${e.cardTitle}"` : ''}. Ajuste os horários para não sobrepor.`
}

/** Timer rodando há mais que o limite: deve ser encerrado no limite. */
export function venceu(startedAt: Date, agora: Date): boolean {
  return agora.getTime() - startedAt.getTime() > LIMITE_SEGUNDOS * 1000
}
