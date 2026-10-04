import { createHash } from 'node:crypto'
import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import type { Prisma } from '../../lib/generated/prisma'

const identifier = z.string().min(1).max(128)
export const TaskPageQuerySchema = z.object({
  projectId: identifier.optional(), sprintId: identifier.optional(),
  backlog: z.enum(['true', 'false']).optional(),
  columnId: identifier.optional(), responsibleId: identifier.optional(),
  priority: z.enum(['baixa', 'media', 'alta']).optional(),
  dueBefore: z.string().datetime().optional(), dueAfter: z.string().datetime().optional(),
  q: z.string().max(500).optional(), fields: z.enum(['summary', 'full']).default('summary'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(2048).optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.projectId && !value.sprintId) ctx.addIssue({ code: 'custom', message: 'Informe projectId ou sprintId' })
  if (value.backlog === 'true' && (!value.projectId || value.sprintId)) ctx.addIssue({ code: 'custom', message: 'backlog exige projectId sem sprintId' })
  if (value.dueBefore && value.dueAfter && new Date(value.dueAfter) > new Date(value.dueBefore)) ctx.addIssue({ code: 'custom', message: 'Intervalo de prazo inválido' })
})
export type TaskPageQuery = z.infer<typeof TaskPageQuerySchema>
const point = z.object({ at: z.string().datetime(), id: identifier }).strict()
const cursorSchema = z.object({ v: z.literal(1), scope: z.string().length(64), upper: point, after: point }).strict()
type Point = z.infer<typeof point>
export function taskPageScope(tenantId: string, query: TaskPageQuery) {
  const { cursor: _cursor, limit: _limit, ...filters } = query
  return createHash('sha256').update(JSON.stringify([tenantId, filters])).digest('hex')
}
export function readTaskCursor(cursor: string | undefined, scope: string) {
  if (!cursor) return null
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error()
    const value = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
    if (value.scope !== scope || value.after.at > value.upper.at || (value.after.at === value.upper.at && value.after.id > value.upper.id)) throw new Error()
    return value
  } catch { throw new BadRequestException('Cursor inválido ou de outra consulta; use next_cursor da mesma listagem') }
}
export function writeTaskCursor(scope: string, upper: Point, last: { id: string; createdAt: Date }) {
  return Buffer.from(JSON.stringify({ v: 1, scope, upper, after: { at: last.createdAt.toISOString(), id: last.id } })).toString('base64url')
}
export function taskPageBoundary(p: Point, direction: 'after' | 'upper'): Prisma.CardWhereInput {
  const date = new Date(p.at)
  return direction === 'after'
    ? { OR: [{ createdAt: { gt: date } }, { createdAt: date, id: { gt: p.id } }] }
    : { OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lte: p.id } }] }
}
