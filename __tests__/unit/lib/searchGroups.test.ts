import { describe, it, expect } from 'vitest'
import { grupoDoCard, ordenarPorGrupo, tempoTotal, formatTempoBusca } from '@/lib/searchGroups'

describe('grupoDoCard', () => {
  it('separa sprint atual, outras sprints e backlog', () => {
    expect(grupoDoCard({ sprint: { id: 's1' } }, 's1')).toBe('sprint_atual')
    expect(grupoDoCard({ sprint: { id: 's2' } }, 's1')).toBe('outras_sprints')
    expect(grupoDoCard({ sprint: null }, 's1')).toBe('backlog')
    expect(grupoDoCard({ sprint: { id: 's1' } })).toBe('outras_sprints')
  })
})

describe('ordenarPorGrupo', () => {
  it('sprint atual primeiro, depois outras sprints, projetos e pessoas; estável dentro do grupo', () => {
    const itens = [
      { id: 'p', group: 'pessoa' as const },
      { id: 'o1', group: 'outras_sprints' as const },
      { id: 'a1', group: 'sprint_atual' as const },
      { id: 'pr', group: 'projeto' as const },
      { id: 'o2', group: 'outras_sprints' as const },
      { id: 'a2', group: 'sprint_atual' as const },
    ]
    expect(ordenarPorGrupo(itens).map(i => i.id)).toEqual(['a1', 'a2', 'o1', 'o2', 'pr', 'p'])
  })
})

describe('tempo', () => {
  it('soma as durações e formata', () => {
    expect(tempoTotal([{ duration: 3600 }, { duration: 1200 }, { duration: null }])).toBe(4800)
    expect(formatTempoBusca(4800)).toBe('1h 20m')
    expect(formatTempoBusca(2700)).toBe('45m')
    expect(formatTempoBusca(7200)).toBe('2h')
    expect(formatTempoBusca(30)).toBe('')
  })
})
