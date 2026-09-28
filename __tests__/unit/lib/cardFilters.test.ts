import { describe, it, expect } from 'vitest'
import { aplicarFiltros, fimDaSemana, filtrosAtivos, FILTROS_PADRAO } from '@/lib/cardFilters'

// Segunda-feira, 28/09/2026 12:00
const now = new Date('2026-09-28T12:00:00')
const ctx = { now, userId: 'eu', concluida: false }

const cards = [
  { id: 'atrasado', endDate: new Date('2026-09-27T10:00:00'), responsibles: [{ user: { id: 'eu' } }], tags: [{ tagId: 'bug' }] },
  { id: 'quinta', endDate: new Date('2026-10-01T18:00:00'), responsibles: [{ user: { id: 'outro' } }], tags: [] },
  { id: 'domingo', endDate: new Date('2026-10-04T23:00:00'), responsibles: [], tags: [{ tagId: 'bug' }] },
  { id: 'proxima', endDate: new Date('2026-10-06T09:00:00'), responsibles: [{ user: { id: 'eu' } }], tags: [] },
  { id: 'sem', endDate: null, responsibles: [], tags: [] },
]
const ids = (xs: { id: string }[]) => xs.map(x => x.id)

describe('fimDaSemana', () => {
  it('vai até domingo 23:59', () => {
    expect(fimDaSemana(now)).toEqual(new Date('2026-10-04T23:59:59.999'))
    expect(fimDaSemana(new Date('2026-10-04T08:00:00'))).toEqual(new Date('2026-10-04T23:59:59.999'))
  })
})

describe('aplicarFiltros', () => {
  it('sem filtros devolve tudo, na mesma ordem', () => {
    expect(ids(aplicarFiltros(cards, FILTROS_PADRAO, ctx))).toEqual(ids(cards))
    expect(filtrosAtivos(FILTROS_PADRAO)).toBe(false)
  })

  it('vence esta semana: ainda não venceu e vence até domingo', () => {
    expect(ids(aplicarFiltros(cards, { ...FILTROS_PADRAO, prazo: 'semana' }, ctx))).toEqual(['quinta', 'domingo'])
  })

  it('atrasados: prazo passou; em coluna de conclusão nunca conta', () => {
    expect(ids(aplicarFiltros(cards, { ...FILTROS_PADRAO, prazo: 'atrasados' }, ctx))).toEqual(['atrasado'])
    expect(aplicarFiltros(cards, { ...FILTROS_PADRAO, prazo: 'atrasados' }, { ...ctx, concluida: true })).toEqual([])
  })

  it('sem prazo', () => {
    expect(ids(aplicarFiltros(cards, { ...FILTROS_PADRAO, prazo: 'sem_prazo' }, ctx))).toEqual(['sem'])
  })

  it('meus cards e etiqueta combinam', () => {
    expect(ids(aplicarFiltros(cards, { ...FILTROS_PADRAO, responsavel: 'meus' }, ctx))).toEqual(['atrasado', 'proxima'])
    expect(ids(aplicarFiltros(cards, { ...FILTROS_PADRAO, responsavel: 'meus', tagId: 'bug' }, ctx))).toEqual(['atrasado'])
  })

  it('ordenar por prazo: mais próximo primeiro, sem prazo por último', () => {
    const embaralhado = [cards[4], cards[3], cards[0], cards[2], cards[1]]
    expect(ids(aplicarFiltros(embaralhado, { ...FILTROS_PADRAO, ordenarPorPrazo: true }, ctx)))
      .toEqual(['atrasado', 'quinta', 'domingo', 'proxima', 'sem'])
  })
})
