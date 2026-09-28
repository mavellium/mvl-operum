import { describe, it, expect } from 'vitest'
import { funcaoKey } from '@/lib/utils/normalize'
import { planejarDeduplicacao, nomesUnicosDeFuncoes, type FuncaoCatalogo } from '@/lib/funcoesDedupe'

function f(id: string, name: string, extra: Partial<FuncaoCatalogo> = {}): FuncaoCatalogo {
  return { id, name, nameKey: name.toLowerCase(), scope: 'TENANT', createdAt: new Date('2026-09-01'), ...extra }
}

describe('funcaoKey', () => {
  it('trata singular/plural, acento, caixa e espaços como a mesma função', () => {
    const k = funcaoKey('Gerente de Projeto')
    expect(funcaoKey('Gerente de Projetos')).toBe(k)
    expect(funcaoKey('  gerente   de  PROJÉTO ')).toBe(k)
  })

  it('singulariza plurais em -res/-zes', () => {
    expect(funcaoKey('Professores')).toBe(funcaoKey('Professor'))
    expect(funcaoKey('Diretores')).toBe(funcaoKey('Diretor'))
  })

  it('mantém funções diferentes distintas', () => {
    expect(funcaoKey('Analista de Sistemas')).not.toBe(funcaoKey('Analista de Dados'))
    expect(funcaoKey('Educador')).not.toBe(funcaoKey('Educadora de Apoio'))
  })
})

describe('planejarDeduplicacao', () => {
  it('mantém o papel RBAC do gerente mesmo quando a duplicata é mais antiga', () => {
    const rbac = f('r-rbac', 'Gerente de Projeto', { nameKey: 'gerente', scope: 'PROJETO', createdAt: new Date('2026-09-10') })
    const manual = f('r-manual', 'Gerente de Projetos', { createdAt: new Date('2026-08-01') })
    const [grupo] = planejarDeduplicacao([manual, rbac])
    expect(grupo.vencedora.id).toBe('r-rbac')
    expect(grupo.duplicadas.map(d => d.id)).toEqual(['r-manual'])
  })

  it('sem papel RBAC no grupo, mantém a mais antiga', () => {
    const nova = f('r2', 'Analistas', { createdAt: new Date('2026-09-20') })
    const velha = f('r1', 'Analista', { createdAt: new Date('2026-01-01') })
    const [grupo] = planejarDeduplicacao([nova, velha])
    expect(grupo.vencedora.id).toBe('r1')
  })

  it('ignora funções sem duplicata', () => {
    expect(planejarDeduplicacao([f('a', 'Analista'), f('b', 'Educador')])).toEqual([])
  })
})

describe('nomesUnicosDeFuncoes', () => {
  it('lista cada função equivalente uma única vez', () => {
    const lista = [
      f('a', 'Analista'),
      f('g1', 'Gerente de Projeto', { nameKey: 'gerente', scope: 'PROJETO' }),
      f('g2', 'Gerente de Projetos'),
    ]
    expect(nomesUnicosDeFuncoes(lista)).toEqual(['Analista', 'Gerente de Projeto'])
  })
})
