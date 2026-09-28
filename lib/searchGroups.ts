/**
 * Ordem dos grupos na busca do projeto (pedido: sprint atual primeiro, depois
 * outras sprints, projetos e pessoas).
 */
export const SEARCH_GROUP_ORDER = [
  'sprint_atual',
  'outras_sprints',
  'backlog',
  'cards_pessoa',
  'projeto',
  'pessoa',
] as const

export type SearchGroup = (typeof SEARCH_GROUP_ORDER)[number]

export const SEARCH_GROUP_LABEL: Record<SearchGroup, string> = {
  sprint_atual: 'Nesta sprint',
  outras_sprints: 'Outras sprints',
  backlog: 'Backlog do projeto',
  cards_pessoa: 'Cards da pessoa',
  projeto: 'Projetos',
  pessoa: 'Pessoas',
}

export function grupoDoCard(card: { sprint?: { id: string } | null }, currentSprintId?: string | null): SearchGroup {
  if (!card.sprint) return 'backlog'
  return currentSprintId && card.sprint.id === currentSprintId ? 'sprint_atual' : 'outras_sprints'
}

/** Ordena estável por grupo, preservando a ordem de relevância dentro de cada grupo. */
export function ordenarPorGrupo<T extends { group: SearchGroup }>(items: T[]): T[] {
  const rank = new Map(SEARCH_GROUP_ORDER.map((g, i) => [g, i]))
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank.get(a.item.group)! - rank.get(b.item.group)! || a.i - b.i)
    .map(x => x.item)
}

/** Soma das durações (segundos) registradas no card. */
export function tempoTotal(entries: { duration?: number | null }[] | undefined): number {
  return (entries ?? []).reduce((acc, e) => acc + (e.duration ?? 0), 0)
}

/** "1h 20m", "45m", "" quando não há tempo. */
export function formatTempoBusca(segundos: number): string {
  if (segundos < 60) return ''
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}
