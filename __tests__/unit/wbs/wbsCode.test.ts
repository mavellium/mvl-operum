import { describe, it, expect } from 'vitest'
import { recalcCodes } from '@/lib/wbsCode'
import type { WbsNodeClient } from '@/types/wbs'

const S = {
  backgroundColor: '#fff', borderColor: '#000', textColor: '#000',
  borderWidth: 1, fontSize: 14, borderRadius: 4,
}

function node(
  id: string,
  parentId: string | null,
  order: number,
  childrenIds: string[]
): WbsNodeClient {
  return { id, parentId, order, code: '', title: id, layout: 'ABAIXO', collapsed: false, style: S, properties: {}, childrenIds }
}

describe('recalcCodes', () => {
  it('nó raiz recebe code "1"', () => {
    const result = recalcCodes({ r: node('r', null, 0, []) })
    expect(result.r.code).toBe('1')
  })

  it('dois filhos da raiz recebem "1.1" e "1.2"', () => {
    const result = recalcCodes({
      r: node('r', null, 0, ['a', 'b']),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })
    expect(result.a.code).toBe('1.1')
    expect(result.b.code).toBe('1.2')
  })

  it('neto recebe "1.1.1"', () => {
    const result = recalcCodes({
      r: node('r', null, 0, ['a']),
      a: node('a', 'r', 0, ['aa']),
      aa: node('aa', 'a', 0, []),
    })
    expect(result.aa.code).toBe('1.1.1')
  })

  it('ordena por `order`, não por posição em childrenIds', () => {
    // b está antes de a no array, mas order de a=0 e b=1
    const result = recalcCodes({
      r: node('r', null, 0, ['b', 'a']),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })
    expect(result.a.code).toBe('1.1')
    expect(result.b.code).toBe('1.2')
  })

  it('regressão lexical: 11 irmãos ordenam por order (não string)', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `c${i}`)
    const children = ids.reduce<Record<string, WbsNodeClient>>((acc, id, i) => {
      acc[id] = node(id, 'r', i, [])
      return acc
    }, {})
    const result = recalcCodes({ r: node('r', null, 0, ids), ...children })
    // Se ordenasse lexicalmente: c1,c10,c2... → c10 viraria 1.2. Aqui deve ser 1.11.
    expect(result.c9.code).toBe('1.10')
    expect(result.c10.code).toBe('1.11')
  })

  it('não muta o estado anterior', () => {
    const nodes = {
      r: node('r', null, 0, ['a']),
      a: node('a', 'r', 0, []),
    }
    const before = nodes.r.code
    recalcCodes(nodes)
    expect(nodes.r.code).toBe(before)
  })

  it('retorna o mapa original quando não há raiz', () => {
    const nodes = { orphan: node('orphan', 'ghost', 0, []) }
    const result = recalcCodes(nodes)
    expect(result).toEqual(nodes)
  })
})
