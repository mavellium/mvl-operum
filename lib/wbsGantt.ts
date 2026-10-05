import type { WbsNodeClient } from '@/types/wbs'
export const DAY_MS = 86400000
export interface WbsSchedule { start: number; end: number }
/** Planned date is a deadline; duration estimates the preceding calendar days. */
export function plannedSchedule(node: WbsNodeClient, duration = node.properties.durationDays ?? 0): WbsSchedule | null {
  const date = node.properties.dataPrevista?.slice(0, 10)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const end = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(end) || new Date(end).toISOString().slice(0, 10) !== date) return null
  const days = Number.isFinite(duration) ? Math.max(1, Math.ceil(duration)) : 1
  const start = end - (days - 1) * DAY_MS
  return Number.isFinite(start) && Math.abs(start) <= 8640000000000000 ? { start, end } : null
}
export function ganttRows(nodes: Record<string, WbsNodeClient>, rootId: string | null, collapsed: ReadonlySet<string>) {
  const rows: { node: WbsNodeClient; depth: number }[] = [], seen = new Set<string>()
  if (!rootId) return rows
  const stack = [{ id: rootId, depth: 0 }]
  while (stack.length) {
    const { id, depth } = stack.pop()!, node = nodes[id]
    if (!node || seen.has(id)) continue
    seen.add(id); rows.push({ node, depth })
    if (collapsed.has(id)) continue
    const children = node.childrenIds.map(c => nodes[c]).filter(Boolean).sort((a,b) => a.order - b.order)
    for (const child of children.reverse()) stack.push({ id: child.id, depth: depth + 1 })
  }
  return rows
}
export function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(timestamp)
}
