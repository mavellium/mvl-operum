import { describe, it, expect } from 'vitest'
import {
  createDefaultStructure,
  structureFromTemplate,
  EAP_TEMPLATE_NAME,
  EAP_TEMPLATE_DESCRIPTION,
} from '@/lib/eapTemplate'
import { recomputeNodeCodes, countNodes, flattenTree } from '@/lib/eapCode'
import type { EapNode } from '@/types/eap'

/** Fábrica de ids sequenciais determinística (ids únicos por árvore). */
function seqFactory(prefix: string): () => string {
  let i = 0
  return () => `${prefix}-${++i}`
}

/** Conta quantos ids únicos existem em toda a árvore. */
function uniqueIds(roots: EapNode[]): Set<string> {
  return new Set(flattenTree(roots).map(x => x.id))
}

describe('createDefaultStructure (SPEC §26)', () => {
  const tree = createDefaultStructure(seqFactory('tpl'))
  const root = tree[0]

  it('gera uma única raiz "[NOME DO PROJETO]" com código "1"', () => {
    expect(tree).toHaveLength(1)
    expect(root.id).toEqual(expect.any(String))
    expect(root).toMatchObject({ code: '1', title: '[NOME DO PROJETO]', level: 1, order: 0 })
  })

  it('seis fases "[ENTREGA / FASE]" com códigos 1.1 a 1.6', () => {
    expect(root.children).toHaveLength(6)
    expect(root.children.map(c => c.title)).toEqual([
      '[ENTREGA / FASE]',
      '[ENTREGA / FASE]',
      '[ENTREGA / FASE]',
      '[ENTREGA / FASE]',
      '[ENTREGA / FASE]',
      '[ENTREGA / FASE]',
    ])
    expect(root.children.map(c => c.code)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'])
    expect(root.children.every(c => c.parentId === root.id)).toBe(true)
  })

  it('quantidade de pacotes por fase: [3, 2, 1, 2, 1, 2]', () => {
    const counts = root.children.map(c => c.children.length)
    expect(counts).toEqual([3, 2, 1, 2, 1, 2])
    for (const phase of root.children) {
      expect(phase.children.every(p => p.title === '[PACOTE DE TRABALHO]')).toBe(true)
    }
  })

  it('códigos dos pacotes corretos (ex.: 1.1.1…1.1.3 e 1.6.1…1.6.2)', () => {
    expect(root.children[0].children.map(c => c.code)).toEqual(['1.1.1', '1.1.2', '1.1.3'])
    expect(root.children[1].children.map(c => c.code)).toEqual(['1.2.1', '1.2.2'])
    expect(root.children[5].children.map(c => c.code)).toEqual(['1.6.1', '1.6.2'])
  })

  it('total de nós = 18 (1 raiz + 6 fases + 11 pacotes), profundidade 3', () => {
    expect(countNodes(tree)).toBe(18)
    let maxLevel = 0
    for (const node of flattenTree(tree)) maxLevel = Math.max(maxLevel, node.level)
    expect(maxLevel).toBe(3)
  })

  it('todos os ids são únicos (matriz replicável)', () => {
    expect(uniqueIds(tree).size).toBe(countNodes(tree))
  })

  it('a árvore retornada é normalizada (parentId/order/level corretos)', () => {
    const flat = flattenTree(tree)
    for (const node of flat) {
      if (node.parentId !== null) {
        const parent = flat.find(x => x.id === node.parentId)
        expect(parent).toBeDefined()
        expect(parent!.children.map(c => c.id)).toContain(node.id)
      }
      expect(node.order).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('structureFromTemplate', () => {
  const template = createDefaultStructure(seqFactory('tpl'))

  it('clona com ids totalmente novos', () => {
    const clone = structureFromTemplate(template, seqFactory('doc'))

    const originalIds = uniqueIds(template)
    const cloneIds = uniqueIds(clone)
    expect(cloneIds.size).toBe(originalIds.size)
    expect([...cloneIds].every(id => !originalIds.has(id))).toBe(true)
    expect(clone[0].id).toBe('doc-1')
  })

  it('preserva títulos, códigos, parentId e nível da cópia', () => {
    const clone = structureFromTemplate(template, seqFactory('doc'))
    const cloneFlat = flattenTree(clone)
    const templateFlat = flattenTree(template)

    expect(cloneFlat.length).toBe(templateFlat.length)
    cloneFlat.forEach((node, i) => {
      expect(node.title).toBe(templateFlat[i].title)
      expect(node.code).toBe(templateFlat[i].code)
      expect(node.level).toBe(templateFlat[i].level)
      if (templateFlat[i].parentId !== null) expect(node.parentId).not.toBeNull()
    })
    expect(clone).toEqual(recomputeNodeCodes(clone))
  })

  it('não muta o template original', () => {
    const before = JSON.stringify(template)
    structureFromTemplate(template, seqFactory('novo'))
    expect(JSON.stringify(template)).toBe(before)
  })

  it('árvore vazia → cópia vazia', () => {
    expect(structureFromTemplate([])).toEqual([])
  })
})

describe('constantes do template', () => {
  it('nome e descrição documentam a matriz protegida', () => {
    expect(EAP_TEMPLATE_NAME).toContain('EAP')
    expect(EAP_TEMPLATE_DESCRIPTION).toContain('matriz')
  })
})