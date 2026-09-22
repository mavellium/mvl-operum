/**
 * Helpers de formatação de datas em pt-BR (dia/mês/ano).
 *
 * Aceita os formatos encontrados no app:
 * - 'yyyy-mm-dd'             (valor de <input type="date"> / coluna String)
 * - 'dd/mm/yyyy'             (valores legados de DocumentVersion.dataAprovacao)
 * - 'yyyy-mm-ddTHH:MM:SSZ'   (datetimes ISO — ex.: Project.startDate via JSON)
 * - instância de Date
 *
 * Datas e datetimes são interpretados pela PARTE DA DATA, sem conversão de fuso
 * horário, evitando "dia anterior" quando o valor foi gravado à meia-noite
 * UTC/local.
 */

export interface DateParts {
  day: number
  month: number
  year: number
}

export function parseDateParts(input: Date | string | null | undefined): DateParts | null {
  if (input == null) return null
  if (typeof input === 'string' && !input.trim()) return null

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null
    return { day: input.getDate(), month: input.getMonth() + 1, year: input.getFullYear() }
  }

  const s = input.trim()

  // dd/mm/yyyy (valores legados)
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const [, d, m, y] = br
    return { day: Number(d), month: Number(m), year: Number(y) }
  }

  // yyyy-mm-dd ou yyyy-mm-ddTHH:MM:SS(.sss)(Z|±hh:mm) — usa apenas a parte da data
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    return { day: Number(d), month: Number(m), year: Number(y) }
  }

  // Última tentativa: deixa o runtime interpretar
  const parsed = new Date(s)
  if (Number.isNaN(parsed.getTime())) return null
  return { day: parsed.getDate(), month: parsed.getMonth() + 1, year: parsed.getFullYear() }
}

/** Formata para dd/mm/aaaa. `fallback` (padrão '—') quando não há data válida. */
export function formatDateBR(input: Date | string | null | undefined, fallback = '—'): string {
  const p = parseDateParts(input)
  if (!p) return fallback
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`
}

/** Converte para o valor esperado por <input type="date">: aaaa-mm-dd. */
export function toDateInputValue(input: Date | string | null | undefined, fallback = ''): string {
  const p = parseDateParts(input)
  if (!p) return fallback
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}