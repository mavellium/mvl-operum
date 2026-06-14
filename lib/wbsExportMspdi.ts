import type { WbsNodeClient } from '@/types/wbs'
import { computeRollups } from './wbsRollup'

export interface MspdiOptions {
  projectName?: string
  currencyCode?: string
  /** Horas por dia de trabalho para converter durationDays → ISO duration (padrão: 8) */
  hoursPerDay?: number
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isoDuration(days: number, hoursPerDay: number): string {
  return `PT${days * hoursPerDay}H0M0S`
}

/**
 * Gera documento MSPDI (MS Project XML) a partir da árvore WBS.
 * Pré-ordem DFS. UID/ID = inteiro sequencial a partir de 1.
 * Cost/Duration nos summary tasks refletem o rollup (§2.10).
 */
export function exportMspdi(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
  opts: MspdiOptions = {}
): string {
  if (!rootId || !nodes[rootId]) return ''

  const {
    projectName = '',
    currencyCode = 'BRL',
    hoursPerDay = 8,
  } = opts

  const rollups = computeRollups(nodes, rootId)

  // Coleta pré-ordem DFS (ordem de importação esperada pelo MS Project)
  const preOrder: Array<{ id: string; depth: number }> = []
  const stack: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 1 }]

  while (stack.length > 0) {
    const { id, depth } = stack.pop()!
    if (!nodes[id]) continue
    preOrder.push({ id, depth })

    const node = nodes[id]
    const sortedChildren = node.childrenIds
      .map(cid => nodes[cid])
      .filter((n): n is WbsNodeClient => Boolean(n))
      .sort((a, b) => a.order - b.order)

    // Empurra em ordem inversa para que o primeiro filho seja processado primeiro
    for (let i = sortedChildren.length - 1; i >= 0; i--) {
      stack.push({ id: sortedChildren[i].id, depth: depth + 1 })
    }
  }

  const taskXml = preOrder
    .map(({ id, depth }, idx) => {
      const node = nodes[id]
      const rollup = rollups[id] ?? { cost: 0, durationDays: 0, isRolledUp: false }
      const uid = idx + 1
      const isSummary = node.childrenIds.some(cid => nodes[cid]) ? 1 : 0
      const notesTag = node.properties.description
        ? `\n      <Notes>${esc(node.properties.description)}</Notes>`
        : ''

      return `    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name>${esc(node.title)}</Name>
      <WBS>${esc(node.code)}</WBS>
      <OutlineNumber>${esc(node.code)}</OutlineNumber>
      <OutlineLevel>${depth}</OutlineLevel>
      <Summary>${isSummary}</Summary>
      <Cost>${rollup.cost.toFixed(2)}</Cost>
      <Duration>${isoDuration(rollup.durationDays, hoursPerDay)}</Duration>
      <DurationFormat>7</DurationFormat>${notesTag}
    </Task>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <Name>${esc(projectName)}</Name>
  <CurrencyCode>${esc(currencyCode)}</CurrencyCode>
  <Tasks>
${taskXml}
  </Tasks>
</Project>`
}
