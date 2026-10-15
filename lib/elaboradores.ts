/**
 * "Elaborado por" da planilha = responsáveis do card ligado (card 15/10, ADR-044).
 * O nó da EAP guarda a lista em `elaboradoPorUserIds`; `elaboradoPorUserId` (o
 * primeiro) e `elaboradoPor` (nomes) continuam preenchidos para quem lê o formato antigo.
 */
export interface PropsElaboradores {
  elaboradoPorUserIds?: string[] | null
  elaboradoPorUserId?: string | null
  elaboradoPor?: string
  /** Já juntou os dois lados uma vez: daqui em diante o card manda. */
  elaboradoSincronizado?: boolean
}

/** Lista de elaboradores do nó, aceitando o formato antigo (um só). */
export function elaboradoresDe(p: PropsElaboradores | undefined | null): string[] {
  if (!p) return []
  if (Array.isArray(p.elaboradoPorUserIds)) return [...new Set(p.elaboradoPorUserIds.filter(id => typeof id === 'string' && id))]
  return p.elaboradoPorUserId ? [p.elaboradoPorUserId] : []
}

/** Propriedades a gravar no nó para a lista dada (ids na ordem, nomes juntos por vírgula). */
export function propsDosElaboradores(ids: readonly string[], nomePorId: ReadonlyMap<string, string>): Required<Omit<PropsElaboradores, 'elaboradoSincronizado'>> {
  const unicos = [...new Set(ids)]
  return {
    elaboradoPorUserIds: unicos,
    elaboradoPorUserId: unicos[0] ?? null,
    elaboradoPor: unicos.map(id => nomePorId.get(id)).filter(Boolean).join(', '),
  }
}

export interface Reconciliacao {
  /** Lista final, igual nos dois lados. */
  ids: string[]
  /** Quem precisa entrar como responsável no card. */
  adicionarNoCard: string[]
  /** Quem precisa sair dos responsáveis do card. */
  removerDoCard: string[]
}

/**
 * Primeira vez (nó ainda não sincronizado): junta os dois lados, responsáveis do
 * card primeiro. Depois disso o card é a fonte: o nó só espelha os responsáveis,
 * para que remover alguém no card não o traga de volta pelo nó.
 */
export function reconciliarElaboradores(doNo: readonly string[], doCard: readonly string[], sincronizado: boolean): Reconciliacao {
  if (sincronizado) return { ids: [...new Set(doCard)], adicionarNoCard: [], removerDoCard: [] }
  const ids = [...new Set([...doCard, ...doNo])]
  return { ids, adicionarNoCard: ids.filter(id => !doCard.includes(id)), removerDoCard: [] }
}

/** Diferença para gravar uma lista escolhida na planilha como responsáveis do card. */
export function diferencaParaCard(escolhidos: readonly string[], doCard: readonly string[]): Pick<Reconciliacao, 'adicionarNoCard' | 'removerDoCard'> {
  return {
    adicionarNoCard: escolhidos.filter(id => !doCard.includes(id)),
    removerDoCard: doCard.filter(id => !escolhidos.includes(id)),
  }
}

/**
 * Valor por minuto da tarefa: todos trabalham o tempo inteiro, então soma o de
 * cada elaborador que tem salário e jornada. Sem nenhum, não há valor (null).
 */
export function somaValoresPorMinuto(valores: ReadonlyArray<number | null | undefined>): number | null {
  const ok = valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return ok.length ? ok.reduce((s, v) => s + v, 0) : null
}

/**
 * Jornada usada para converter minutos em dias: em paralelo, a tarefa dura o
 * tempo de quem tem menos horas por dia. Sem jornada cadastrada, null.
 */
export function menorJornada(jornadas: ReadonlyArray<number | null | undefined>): number | null {
  const ok = jornadas.filter((h): h is number => typeof h === 'number' && h > 0)
  return ok.length ? Math.min(...ok) : null
}
