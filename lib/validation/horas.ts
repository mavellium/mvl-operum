/**
 * Horas por dia do stakeholder (SDD 4.5). Regra única para a tela e para a
 * action: aceita "8", "8,5", "8.5" e "8:30" (todos 8,5 h) e exige mais que 0 e
 * no máximo 24 h, com até 2 casas decimais. Campo vazio é permitido (opcional).
 *
 * O campo era `type="number"`: no Firefox, "8,5" chegava vazio e o valor era
 * descartado sem aviso; "8:30" não era aceito em navegador nenhum.
 */
export const MAX_HORAS_DIA = 24

export const ERRO_HORAS = `Informe as horas por dia entre 0 e ${MAX_HORAS_DIA} (ex.: 8, 8,5 ou 8:30).`

export interface HorasResultado {
  /** Horas em decimal (8:30 → 8.5), arredondadas a 2 casas; null quando vazio ou inválido. */
  valor: number | null
  /** Mensagem para o usuário; null quando válido ou vazio. */
  erro: string | null
}

const HH_MM = /^(\d{1,2}):([0-5]\d)$/
const DECIMAL = /^\d{1,2}(?:[.,]\d{1,2})?$/

export function parseHoras(input: string | number | null | undefined): HorasResultado {
  if (input === null || input === undefined) return { valor: null, erro: null }

  let horas: number
  if (typeof input === 'number') {
    horas = input
  } else {
    const texto = input.trim()
    if (!texto) return { valor: null, erro: null }
    const hhmm = texto.match(HH_MM)
    if (hhmm) horas = Number(hhmm[1]) + Number(hhmm[2]) / 60
    else if (DECIMAL.test(texto)) horas = Number(texto.replace(',', '.'))
    else return { valor: null, erro: ERRO_HORAS }
  }

  if (!Number.isFinite(horas) || horas <= 0 || horas > MAX_HORAS_DIA) return { valor: null, erro: ERRO_HORAS }
  return { valor: Math.round(horas * 100) / 100, erro: null }
}

/** 8.5 → "8,5"; 8 → "8". Para exibir o valor salvo no campo. */
export function formatHoras(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
