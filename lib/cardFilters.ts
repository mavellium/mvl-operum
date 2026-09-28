export type FiltroPrazo = 'todos' | 'semana' | 'atrasados' | 'sem_prazo'

export interface CardFilters {
  /** 'meus': só cards em que o usuário logado é responsável. */
  responsavel: 'todos' | 'meus'
  tagId: string | null
  prazo: FiltroPrazo
  ordenarPorPrazo: boolean
}

export const FILTROS_PADRAO: CardFilters = { responsavel: 'todos', tagId: null, prazo: 'todos', ordenarPorPrazo: false }

export function filtrosAtivos(f: CardFilters): boolean {
  return f.responsavel !== 'todos' || f.tagId !== null || f.prazo !== 'todos' || f.ordenarPorPrazo
}

/** Domingo 23:59:59.999 da semana de `now` (semana de segunda a domingo). */
export function fimDaSemana(now: Date): Date {
  const d = new Date(now)
  const diasAteDomingo = (7 - d.getDay()) % 7
  d.setDate(d.getDate() + diasAteDomingo)
  d.setHours(23, 59, 59, 999)
  return d
}

interface FiltravelCard {
  endDate?: Date | string | null
  responsibles?: { user: { id: string } }[]
  tags?: { tagId: string }[]
}

interface Contexto {
  now: Date
  userId?: string | null
  /** Coluna de conclusão: seus cards nunca contam como atrasados. */
  concluida: boolean
}

function passaPrazo(card: FiltravelCard, prazo: FiltroPrazo, ctx: Contexto): boolean {
  if (prazo === 'todos') return true
  const fim = card.endDate ? new Date(card.endDate).getTime() : null
  if (prazo === 'sem_prazo') return fim === null
  if (fim === null) return false
  if (prazo === 'atrasados') return !ctx.concluida && fim < ctx.now.getTime()
  // semana: ainda não venceu e vence até domingo
  return fim >= ctx.now.getTime() && fim <= fimDaSemana(ctx.now).getTime()
}

/** Aplica os filtros e, se pedido, ordena por prazo (sem prazo por último; estável). */
export function aplicarFiltros<T extends FiltravelCard>(cards: T[], f: CardFilters, ctx: Contexto): T[] {
  const filtrados = cards.filter(c =>
    (f.responsavel === 'todos' || (!!ctx.userId && (c.responsibles ?? []).some(r => r.user.id === ctx.userId))) &&
    (f.tagId === null || (c.tags ?? []).some(t => t.tagId === f.tagId)) &&
    passaPrazo(c, f.prazo, ctx),
  )
  if (!f.ordenarPorPrazo) return filtrados
  const chave = (c: T) => (c.endDate ? new Date(c.endDate).getTime() : Number.POSITIVE_INFINITY)
  return filtrados
    .map((c, i) => ({ c, i }))
    .sort((a, b) => chave(a.c) - chave(b.c) || a.i - b.i)
    .map(x => x.c)
}
