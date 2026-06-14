import { describe, it, expect } from 'vitest'
import { exportMspdi } from '@/lib/wbsExportMspdi'
import type { WbsNodeClient } from '@/types/wbs'

const S = {
  backgroundColor: '#fff', borderColor: '#000', textColor: '#000',
  borderWidth: 1, fontSize: 14, borderRadius: 4,
}

function node(
  id: string,
  parentId: string | null,
  order: number,
  childrenIds: string[],
  title: string,
  code: string,
  cost?: number,
  durationDays?: number,
  description?: string
): WbsNodeClient {
  return {
    id, parentId, order, code, title,
    layout: 'ABAIXO', collapsed: false, style: S,
    properties: { cost, durationDays, description },
    childrenIds,
  }
}

/** Árvore simples: raiz → [A, B] */
function makeTree(): Record<string, WbsNodeClient> {
  return {
    r: node('r', null, 0, ['a', 'b'], 'Root', '1'),
    a: node('a', 'r', 0, [], 'Task A', '1.1', 100, 5),
    b: node('b', 'r', 1, [], 'Task B', '1.2', 200, 3),
  }
}

describe('exportMspdi', () => {
  it('retorna string vazia para rootId null', () => {
    expect(exportMspdi({}, null)).toBe('')
  })

  it('retorna string vazia para rootId inexistente', () => {
    expect(exportMspdi({}, 'nope')).toBe('')
  })

  it('produz declaração XML e elemento Project', () => {
    const xml = exportMspdi(makeTree(), 'r')
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<Project xmlns="http://schemas.microsoft.com/project">')
    expect(xml).toContain('</Project>')
  })

  it('inclui Name, CurrencyCode e SaveVersion no cabeçalho', () => {
    const xml = exportMspdi(makeTree(), 'r', { projectName: 'Alpha', currencyCode: 'USD' })
    expect(xml).toContain('<Name>Alpha</Name>')
    expect(xml).toContain('<CurrencyCode>USD</CurrencyCode>')
    expect(xml).toContain('<SaveVersion>14</SaveVersion>')
  })

  it('raiz com filhos: Summary=1', () => {
    const xml = exportMspdi(makeTree(), 'r')
    const rootTaskBlock = xml.slice(xml.indexOf('<Name>Root</Name>') - 100, xml.indexOf('<Name>Root</Name>') + 400)
    expect(rootTaskBlock).toContain('<Summary>1</Summary>')
  })

  it('folha: Summary=0', () => {
    const xml = exportMspdi(makeTree(), 'r')
    const aBlock = xml.slice(xml.indexOf('<Name>Task A</Name>') - 100, xml.indexOf('<Name>Task A</Name>') + 400)
    expect(aBlock).toContain('<Summary>0</Summary>')
  })

  it('Cost da raiz reflete rollup dos filhos (100 + 200 = 300)', () => {
    const xml = exportMspdi(makeTree(), 'r')
    // Root task (primeiro <Task>) deve ter Cost=300.00
    const firstTask = xml.slice(xml.indexOf('<Task>'), xml.indexOf('</Task>') + 7)
    expect(firstTask).toContain('<Cost>300.00</Cost>')
  })

  it('Duration usa hoursPerDay=8 (5 dias = PT40H)', () => {
    const xml = exportMspdi(makeTree(), 'r', { hoursPerDay: 8 })
    expect(xml).toContain('<Duration>PT40H0M0S</Duration>')
  })

  it('Duration com hoursPerDay personalizado', () => {
    const xml = exportMspdi(makeTree(), 'r', { hoursPerDay: 6 })
    // Task A: 5 * 6 = 30h
    expect(xml).toContain('<Duration>PT30H0M0S</Duration>')
  })

  it('WBS e OutlineNumber refletem o code', () => {
    const xml = exportMspdi(makeTree(), 'r')
    expect(xml).toContain('<WBS>1.1</WBS>')
    expect(xml).toContain('<OutlineNumber>1.1</OutlineNumber>')
  })

  it('OutlineLevel da raiz é 1', () => {
    const xml = exportMspdi(makeTree(), 'r')
    const firstTask = xml.slice(xml.indexOf('<Task>'), xml.indexOf('</Task>') + 7)
    expect(firstTask).toContain('<OutlineLevel>1</OutlineLevel>')
  })

  it('OutlineLevel dos filhos diretos é 2', () => {
    const xml = exportMspdi(makeTree(), 'r')
    const aBlock = xml.slice(xml.indexOf('<Name>Task A</Name>') - 150, xml.indexOf('<Name>Task A</Name>') + 400)
    expect(aBlock).toContain('<OutlineLevel>2</OutlineLevel>')
  })

  it('pré-ordem: UID sequencial começando em 1', () => {
    const xml = exportMspdi(makeTree(), 'r')
    const uids = [...xml.matchAll(/<UID>(\d+)<\/UID>/g)].map(m => Number(m[1]))
    expect(uids).toEqual([1, 2, 3])
  })

  it('escapa caracteres XML especiais no title', () => {
    const nodes: Record<string, WbsNodeClient> = {
      r: node('r', null, 0, [], 'Alpha & <Beta> "Gamma"', '1'),
    }
    const xml = exportMspdi(nodes, 'r')
    expect(xml).toContain('Alpha &amp; &lt;Beta&gt; &quot;Gamma&quot;')
  })

  it('inclui <Notes> quando description está presente', () => {
    const nodes: Record<string, WbsNodeClient> = {
      r: node('r', null, 0, [], 'Root', '1', undefined, undefined, 'Nota aqui'),
    }
    const xml = exportMspdi(nodes, 'r')
    expect(xml).toContain('<Notes>Nota aqui</Notes>')
  })

  it('omite <Notes> quando description está ausente', () => {
    const xml = exportMspdi(makeTree(), 'r')
    expect(xml).not.toContain('<Notes>')
  })

  it('snapshot para árvore pequena', () => {
    const xml = exportMspdi(makeTree(), 'r', { projectName: 'Projeto Teste', currencyCode: 'BRL' })
    expect(xml).toMatchSnapshot()
  })
})
