import { describe, it, expect } from 'vitest'
import { prazoStatus, isColunaConcluida, formatPrazoCurto, toDatetimeLocal, fromDatetimeLocal } from '@/lib/cardUtils'

const agora = new Date('2026-09-28T12:00:00')

describe('prazoStatus', () => {
  it('sem prazo -> null', () => {
    expect(prazoStatus(null, agora, false)).toBeNull()
    expect(prazoStatus(undefined, agora, false)).toBeNull()
    expect(prazoStatus('lixo', agora, false)).toBeNull()
  })

  it('prazo vencido e card não concluído -> atrasado', () => {
    expect(prazoStatus(new Date('2026-09-26T18:00:00'), agora, false)).toBe('atrasado')
  })

  it('vence em até 2 dias -> proximo', () => {
    expect(prazoStatus(new Date('2026-09-28T13:00:00'), agora, false)).toBe('proximo')
    expect(prazoStatus(new Date('2026-09-30T12:00:00'), agora, false)).toBe('proximo')
  })

  it('mais de 2 dias -> ok', () => {
    expect(prazoStatus(new Date('2026-09-30T12:00:01'), agora, false)).toBe('ok')
  })

  it('card concluído nunca fica atrasado', () => {
    expect(prazoStatus(new Date('2026-09-01T00:00:00'), agora, true)).toBe('concluido')
  })

  it('aceita string ISO vinda da API', () => {
    expect(prazoStatus('2026-10-10T02:59:00.000Z', agora, false)).toBe('ok')
  })
})

describe('isColunaConcluida', () => {
  it('reconhece variações de "Concluído"', () => {
    expect(isColunaConcluida('Concluído')).toBe(true)
    expect(isColunaConcluida(' concluido ')).toBe(true)
    expect(isColunaConcluida('Done')).toBe(true)
    expect(isColunaConcluida('Em teste')).toBe(false)
    expect(isColunaConcluida(null)).toBe(false)
  })
})

describe('formatPrazoCurto', () => {
  it('mesmo ano -> dd/mm', () => {
    expect(formatPrazoCurto(new Date('2026-09-30T23:59:00'), agora)).toBe('30/09')
  })
  it('outro ano -> dd/mm/aa', () => {
    expect(formatPrazoCurto(new Date('2027-01-05T10:00:00'), agora)).toBe('05/01/27')
  })
})

describe('datetime-local', () => {
  it('ida e volta preserva o instante', () => {
    const iso = '2026-09-30T23:59:00.000Z'
    expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso)
  })
  it('vazio remove a data', () => {
    expect(fromDatetimeLocal('')).toBeNull()
    expect(toDatetimeLocal(null)).toBe('')
  })
})
