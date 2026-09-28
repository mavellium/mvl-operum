import { describe, it, expect } from 'vitest'
import { sprintPath, sprintDashboardPath } from '@/lib/sprintPath'

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

describe('sprintDashboardPath', () => {
  it('usa a rota dentro do projeto (menu do projeto, não o do admin)', () => {
    expect(sprintDashboardPath('s1', 'p1')).toBe('/projetos/p1/sprints/s1/dashboard')
  })

  it('cai na rota legada sem projectId', () => {
    expect(sprintDashboardPath('s1')).toBe('/dashboard/sprint/s1')
  })
})
