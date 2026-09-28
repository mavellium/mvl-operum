import { funcaoKey } from '@/lib/utils/normalize'

export interface FuncaoCatalogo {
  id: string
  name: string
  nameKey: string
  scope: 'TENANT' | 'PROJETO'
  createdAt: Date
}

export interface GrupoDuplicado {
  chave: string
  vencedora: FuncaoCatalogo
  duplicadas: FuncaoCatalogo[]
}

/**
 * O papel RBAC do gerente (nameKey "gerente", escopo PROJETO) é criado pelo
 * sistema e referenciado por código — nunca pode ser a função descartada.
 */
function prioridade(f: FuncaoCatalogo): number {
  return f.scope === 'PROJETO' && f.nameKey === 'gerente' ? 0 : 1
}

function escolherVencedora(grupo: FuncaoCatalogo[]): FuncaoCatalogo {
  return [...grupo].sort(
    (a, b) => prioridade(a) - prioridade(b) || a.createdAt.getTime() - b.createdAt.getTime(),
  )[0]
}

/** Agrupa as funções equivalentes (mesma `funcaoKey`) e indica qual manter. */
export function planejarDeduplicacao(funcoes: FuncaoCatalogo[]): GrupoDuplicado[] {
  const grupos = new Map<string, FuncaoCatalogo[]>()
  for (const f of funcoes) {
    const chave = funcaoKey(f.name)
    grupos.set(chave, [...(grupos.get(chave) ?? []), f])
  }
  const resultado: GrupoDuplicado[] = []
  for (const [chave, grupo] of grupos) {
    if (grupo.length < 2) continue
    const vencedora = escolherVencedora(grupo)
    resultado.push({ chave, vencedora, duplicadas: grupo.filter(f => f.id !== vencedora.id) })
  }
  return resultado
}

/** Uma entrada por função equivalente, preservando a ordem de entrada. */
export function nomesUnicosDeFuncoes(funcoes: FuncaoCatalogo[]): string[] {
  const duplicadas = new Set(planejarDeduplicacao(funcoes).flatMap(g => g.duplicadas.map(d => d.id)))
  return funcoes.filter(f => !duplicadas.has(f.id)).map(f => f.name)
}
