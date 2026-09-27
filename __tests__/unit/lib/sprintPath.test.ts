import { describe, it, expect } from 'vitest'
import { sprintPath } from '@/lib/sprintPath'

describe('sprintPath', () => {
  it('usa a rota do projeto quando há projectId', () => {
    expect(sprintPath('s1', 'p1')).toBe('/projetos/p1/sprints/s1')
  })

  it('cai na rota legada sem projectId', () => {
    expect(sprintPath('s1')).toBe('/sprints/s1')
    expect(sprintPath('s1', null)).toBe('/sprints/s1')
  })

  it('anexa o card como query string', () => {
    expect(sprintPath('s1', 'p1', 'c1')).toBe('/projetos/p1/sprints/s1?card=c1')
    expect(sprintPath('s1', undefined, 'c1')).toBe('/sprints/s1?card=c1')
  })
})
