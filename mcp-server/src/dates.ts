import { z } from 'zod'
import { UserError } from './errors.js'

export const dateInput = z
  .string()
  .describe('Data ISO 8601 (ex.: 2026-10-01 ou 2026-10-01T09:00:00-03:00).')

/**
 * Os serviços do Operum validam datas com z.string().datetime() (só UTC com "Z").
 * Aceita qualquer data parseável na tool e normaliza para ISO UTC.
 */
export function toIso(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new UserError(`${field}: data inválida "${value}". Use ISO 8601, ex.: 2026-10-01.`)
  return date.toISOString()
}
