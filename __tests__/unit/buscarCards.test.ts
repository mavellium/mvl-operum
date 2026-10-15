import { describe, it, expect } from 'vitest'
import { buscarCards, normalizarBusca } from '@/lib/cardFilters'

const cards = [
  { id: '1', title: 'Corrigir anexo', eapCode: '1.1.3', description: 'URL do MinIO', responsibles: [{ user: { name: 'Vinícius Mota' } }], tags: [{ tag: { name: 'Bug' } }] },
  { id: '2', title: 'Gráfico de Gantt', description: null },
  { id: '3', title: 'Formulário de Partes Interessadas', description: 'paisagem' },
]
const ids = (r: { id: string }[]) => r.map(c => c.id)

describe('normalizarBusca', () => {
  it('ignora acentos, maiúsculas e espaços nas pontas', () => {
    expect(normalizarBusca('  GRÁFICO Ação ')).toBe('grafico acao')
  })
})

describe('buscarCards', () => {
  it('busca vazia ou só com espaços devolve todos', () => {
    expect(buscarCards(cards, '')).toBe(cards)
    expect(buscarCards(cards, '   ')).toBe(cards)
  })

  it('encontra pelo título sem depender de acento', () => {
    expect(ids(buscarCards(cards, 'grafico'))).toEqual(['2'])
  })

  it('encontra pelo código da EAP, descrição, responsável e etiqueta', () => {
    expect(ids(buscarCards(cards, '1.1.3'))).toEqual(['1'])
    expect(ids(buscarCards(cards, 'minio'))).toEqual(['1'])
    expect(ids(buscarCards(cards, 'vinicius'))).toEqual(['1'])
    expect(ids(buscarCards(cards, 'bug'))).toEqual(['1'])
    expect(ids(buscarCards(cards, 'paisagem'))).toEqual(['3'])
  })

  it('exige todas as palavras, em qualquer ordem', () => {
    expect(ids(buscarCards(cards, 'interessadas formulario'))).toEqual(['3'])
    expect(ids(buscarCards(cards, 'formulario gantt'))).toEqual([])
  })
})
