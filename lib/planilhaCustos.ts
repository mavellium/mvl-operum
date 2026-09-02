import type { WbsNodeClient } from '@/types/wbs'
import { custoFolhaPrevisto, custoFolhaRealizado, round2 } from '@/lib/custosCalc'

/**
 * Planilha de Custos — modelo IDÊNTICO (§F).
 * Fonte única: folhas da EAP (`WbsNode.properties`). Custo SEMPRE derivado:
 *   valorPorMinuto = valorReferencia / 30 / horasPorDia / 60  (§5.1 v1)
 *   custo = min × valorPorMinuto + materiais.
 */

export interface PlanilhaConfig {
  valorReferencia: number
  horasPorDia: number
}

export type SituacaoAtividade = 'Antecipada' | 'No prazo' | 'Atrasada' | 'Pendente'

export interface LinhaAtividade {
  nodeId: string
  codigo: string
  titulo: string
  elaboradoPor: string
  elaboradoPorUserId: string | null
  /** valor por minuto efetivo (do membro, ou fallback valorReferencia) */
  vpm: number
  // Orçado
  minOrcado: number
  materiaisOrcado: number
  dataPrevista: string | null
  rOrcado: number
  totalOrcado: number
  // Realizado
  minReal: number
  materiaisReal: number
  dataRealizacao: string | null
  rReal: number
  totalReal: number
  situacao: SituacaoAtividade
}

export interface LinhaMacrofase {
  nodeId: string
  codigo: string
  titulo: string
  atividades: LinhaAtividade[]
  // Orçado (sub-total)
  minOrcado: number
  materiaisOrcado: number
  totalOrcado: number
  // Realizado (sub-total)
  minReal: number
  materiaisReal: number
  totalReal: number
}

export interface QuadroValor {
  fase: string
  orcado: number
  realizado: number
}

export interface QuadroTempo {
  fase: string
  minOrcado: number
  minReal: number
}

export interface QuadroElaborador {
  elaborador: string
  qtdeAtividades: number
  percentual: number
}

export interface PlanilhaDeCustos {
  config: PlanilhaConfig & { valorPorMinuto: number }
  macrofases: LinhaMacrofase[]
  qtdeAtividades: number
  totalOrcado: number
  totalReal: number
  tempoOrcadoTotal: number
  tempoRealTotal: number
  quadros: {
    valor: QuadroValor[]
    tempo: QuadroTempo[]
    elaboradores: QuadroElaborador[]
  }
}

export function valorPorMinutoDe(config: PlanilhaConfig): number {
  return config.valorReferencia / 30 / config.horasPorDia / 60
}

/** Membro interno (UserProject) que pode elaborar — salário mensal e jornada. */
export interface Elaborador {
  userId: string
  name: string
  /** salário mensal (R$); se vazio usa valorReferencia */
  remuneracao: number | null
  horasDiarias: number | null
}

/** valor por minuto do membro — remuneracao / 30 / horasDiarias / 60. */
export function valorPorMinutoDoElaborador(e: Elaborador, config: PlanilhaConfig): number {
  const remuneracao = e.remuneracao && e.remuneracao > 0 ? e.remuneracao : config.valorReferencia
  const horas = e.horasDiarias && e.horasDiarias > 0 ? e.horasDiarias : config.horasPorDia
  return remuneracao / 30 / horas / 60
}

/** ISO `yyyy-mm-dd` → `dd/mm/aaaa` (comparação lexicográfica vale como data). */
export function fmtDataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

export function situacaoDe(prevista: string | null, realizacao: string | null): SituacaoAtividade {
  if (!realizacao) return 'Pendente'
  if (prevista) {
    if (realizacao < prevista) return 'Antecipada'
    if (realizacao === prevista) return 'No prazo'
  }
  return 'Atrasada'
}

function coletaFolhas(nodes: Record<string, WbsNodeClient>, nodeId: string): WbsNodeClient[] {
  const stack = [nodes[nodeId]]
  const folhas: WbsNodeClient[] = []
  while (stack.length > 0) {
    const n = stack.pop()
    if (!n) continue
    if (n.childrenIds.length === 0) {
      folhas.push(n)
    } else {
      for (let i = n.childrenIds.length - 1; i >= 0; i--) {
        stack.push(nodes[n.childrenIds[i]])
      }
    }
  }
  return folhas
}

export function computarPlanilhaCustos(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
  config: PlanilhaConfig,
  elaboradores?: Map<string, Elaborador>,
): PlanilhaDeCustos {
  const vpmPadrao = valorPorMinutoDe(config)
  const vpmDe = (userId: string | null): number => {
    if (!userId) return vpmPadrao
    const e = elaboradores?.get(userId)
    return e ? valorPorMinutoDoElaborador(e, config) : vpmPadrao
  }
  const fatura = (min: number, materiais: number, vpm: number) => custoFolhaPrevisto(min, vpm, materiais)
  const faturaReal = (min: number, materiais: number, vpm: number) => custoFolhaRealizado(min, vpm, materiais)

  const rOrcado = (min: number, vpm: number) => round2(min * vpm)
  const rReal = (min: number, vpm: number) => round2(min * vpm)

  const macrofases: LinhaMacrofase[] = []
  if (rootId && nodes[rootId]) {
    for (const faseId of nodes[rootId].childrenIds) {
      const fase = nodes[faseId]
      if (!fase || fase.childrenIds.length === 0) continue

      const atividades: LinhaAtividade[] = coletaFolhas(nodes, faseId).map(n => {
        const p = n.properties
        const minOrcado = p.tempoMinutos ?? 0
        const materiaisOrcado = p.materiais ?? 0
        const minReal = p.tempoRealMinutos ?? 0
        const materiaisReal = p.materiaisReal ?? 0
        const vpm = vpmDe(p.elaboradoPorUserId ?? null)
        return {
          nodeId: n.id,
          codigo: n.code,
          titulo: n.title,
          elaboradoPor: p.elaboradoPor ?? '',
          elaboradoPorUserId: p.elaboradoPorUserId ?? null,
          vpm,
          minOrcado,
          materiaisOrcado,
          dataPrevista: p.dataPrevista ?? null,
          rOrcado: rOrcado(minOrcado, vpm),
          totalOrcado: fatura(minOrcado, materiaisOrcado, vpm),
          minReal,
          materiaisReal,
          dataRealizacao: p.dataRealizacao ?? null,
          rReal: rReal(minReal, vpm),
          totalReal: faturaReal(minReal, materiaisReal, vpm),
          situacao: situacaoDe(p.dataPrevista ?? null, p.dataRealizacao ?? null),
        }
      })

      macrofases.push({
        nodeId: fase.id,
        codigo: fase.code,
        titulo: fase.title,
        atividades,
        minOrcado: atividades.reduce((s, a) => s + a.minOrcado, 0),
        materiaisOrcado: atividades.reduce((s, a) => s + a.materiaisOrcado, 0),
        totalOrcado: atividades.reduce((s, a) => s + a.totalOrcado, 0),
        minReal: atividades.reduce((s, a) => s + a.minReal, 0),
        materiaisReal: atividades.reduce((s, a) => s + a.materiaisReal, 0),
        totalReal: atividades.reduce((s, a) => s + a.totalReal, 0),
      })
    }
  }

  const todas = macrofases.flatMap(f => f.atividades)

  // Quadro 3 — elaboradores
  const porElaborador = new Map<string, number>()
  for (const a of todas) {
    const nome = a.elaboradoPor.trim()
    if (!nome) continue
    porElaborador.set(nome, (porElaborador.get(nome) ?? 0) + 1)
  }
  const totalAtividades = todas.length
  const quadroElaboradores = [...porElaborador.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([elaborador, qtdeAtividades]) => ({
      elaborador,
      qtdeAtividades,
      percentual: totalAtividades > 0 ? Math.round((qtdeAtividades / totalAtividades) * 1000) / 10 : 0,
    }))

  return {
    config: { ...config, valorPorMinuto: vpmPadrao },
    macrofases,
    qtdeAtividades: totalAtividades,
    totalOrcado: round2(macrofases.reduce((s, f) => s + f.totalOrcado, 0)),
    totalReal: round2(macrofases.reduce((s, f) => s + f.totalReal, 0)),
    tempoOrcadoTotal: macrofases.reduce((s, f) => s + f.minOrcado, 0),
    tempoRealTotal: macrofases.reduce((s, f) => s + f.minReal, 0),
    quadros: {
      valor: macrofases.map(f => ({ fase: `${f.codigo} ${f.titulo}`, orcado: f.totalOrcado, realizado: f.totalReal })),
      tempo: macrofases.map(f => ({ fase: `${f.codigo} ${f.titulo}`, minOrcado: f.minOrcado, minReal: f.minReal })),
      elaboradores: quadroElaboradores,
    },
  }
}