import { describe, it, expect, beforeEach } from 'vitest'
import {
  insertChild,
  insertSibling,
  removeNode,
  duplicateNode,
  moveNode,
  moveNodeRelative,
  updateTitle,
  findParentId,
  listCandidateParents,
} from '@/lib/eapTree'
import { flattenTree } from '@/lib/eapCode'
import type { EapNode } from '@/types/eap'

function n(id: string, title: string, children: EapNode[] = []): EapNode {
  return { id, parentId: null, code: '', title, level: 1, order: 0, children }
}

function plainTree(): EapNode[] {
  return [
    n('r', 'Projeto', [
      n('f1', 'Fase A', [n('p11', 'Pacote A1'), n('p12', 'Pacote A2'), n('p13', 'Pacote A3')]),
      n('f2', 'Fase B', [n('p21', 'Pacote B1'), n('p22', 'Pacote B2')]),
      n('f3', 'Fase C', []),
    ]),
  ]
}

/** Fábrica de ids sequenciais determinística para os testes. */
let seq = 0
function seqId(): string {
  return `novo-${++seq}`
}

beforeEach(() => {
  seq = 0
})

describe('insertChild', () => {
  it('adiciona no fim da lista de filhos e renumera os códigos', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A'), n('b', 'B')])]
    const out = insertChild(tree, 'r', 'Novo', seqId)

    expect(out[0].children.length).toBe(3)
    expect(out[0].children.map(c => c.code)).toEqual(['1.1', '1.2', '1.3'])
    expect(out[0].children[2]).toMatchObject({ id: 'novo-1', title: 'Novo', parentId: 'r' })
  })

  it('usa o placeholder padrão quando o título não é informado', () => {
    const out = insertChild(plainTree(), 'f3', undefined, seqId)
    expect(out[0].children[2].children[0].title).toBe('[PACOTE DE TRABALHO]')
  })

  it('nó inexistente → devolve a mesma árvore, sem mutação', () => {
    const tree = plainTree()
    const out = insertChild(tree, 'nao-existe', 'X', seqId)
    expect(out).toBe(tree)
    expect(seq).toBe(0)
  })

  it('é imutável: árvore original permanece intacta', () => {
    const tree = plainTree()
    const out = insertChild(tree, 'r', 'Novo', seqId)
    expect(out).not.toBe(tree)
    expect(tree[0].children.length).toBe(3)
    expect(tree[0].children[0].children.map(c => c.code)).toEqual(['', '', ''])
  })
})

describe('insertSibling', () => {
  it('insere logo após o nó, no mesmo pai, e renumera', () => {
    const out = insertSibling(plainTree(), 'p11', 'Novo irmão', seqId)
    const f1 = out[0].children[0]
    expect(f1.children.map(c => c.code)).toEqual(['1.1.1', '1.1.2', '1.1.3', '1.1.4'])
    expect(f1.children[1]).toMatchObject({ id: 'novo-1', title: 'Novo irmão', parentId: 'f1' })
    expect(f1.children[2].id).toBe('p12')
    expect(f1.children[3].id).toBe('p13')
  })

  it('insere irmão após a raiz (nível 1)', () => {
    const out = insertSibling([n('r', 'Raiz')], 'r', 'Raiz 2', seqId)
    expect(out.map(x => x.code)).toEqual(['1', '2'])
    expect(out[1].parentId).toBeNull()
  })

  it('nó inexistente → devolve a mesma árvore', () => {
    const tree = plainTree()
    const out = insertSibling(tree, 'nao-existe', 'X', seqId)
    expect(out).toBe(tree)
  })
})

describe('removeNode', () => {
  it('SPEC §10: remover "1.2" faz "1.3" virar "1.2"', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A'), n('b', 'B'), n('c', 'C')])]
    const out = removeNode(tree, 'b')
    expect(out[0].children.map(c => c.id)).toEqual(['a', 'c'])
    expect(out[0].children.map(c => c.code)).toEqual(['1.1', '1.2'])
  })

  it('remove também toda a subárvore', () => {
    const out = removeNode(plainTree(), 'f1')
    expect(out[0].children.length).toBe(2)
    expect(flattenTree(out).map(x => x.id)).toEqual(['r', 'f2', 'p21', 'p22', 'f3'])
  })

  it('remover a raiz esvazia o documento (caso extremo)', () => {
    expect(removeNode(plainTree(), 'r')).toEqual([])
  })

  it('nó inexistente → devolve a mesma árvore, sem mutação', () => {
    const tree = plainTree()
    expect(removeNode(tree, 'nao-existe')).toBe(tree)
  })
})

describe('duplicateNode', () => {
  it('duplica nó com subárvore, ids novos, inserido logo após o original', () => {
    const out = duplicateNode(plainTree(), 'f1', seqId)
    const f1 = out[0].children[0]
    const clone = out[0].children[1]

    expect(clone.id).toBe('novo-1')
    expect(clone.title).toBe('Fase A')
    expect(clone.code).toBe('1.2')
    expect(clone.children.map(c => c.id)).toEqual(['novo-2', 'novo-3', 'novo-4'])
    expect(clone.children[0].code).toBe('1.2.1')
    expect(out[0].children[2].id).toBe('f2')
    expect(out[0].children[2].code).toBe('1.3')
    // O original não muda de código nem de id.
    expect(f1).toMatchObject({ id: 'f1', code: '1.1' })
  })

  it('nó inexistente → devolve a mesma árvore', () => {
    const tree = plainTree()
    expect(duplicateNode(tree, 'nao-existe', seqId)).toBe(tree)
    expect(seq).toBe(0)
  })
})

describe('moveNode', () => {
  it('move um nó para debaixo de outro pai e renumera', () => {
    const out = moveNode(plainTree(), 'f2', 'f3')
    // r agora tem [f1, f3]; f3 passou a ser pai de f2.
    expect(out[0].children.map(c => c.id)).toEqual(['f1', 'f3'])
    expect(out[0].children.map(c => c.code)).toEqual(['1.1', '1.2'])
    const f3 = out[0].children[1]
    expect(f3.children.map(c => c.id)).toEqual(['f2'])
    expect(f3.children[0].code).toBe('1.2.1')
    expect(f3.children[0].children[0].code).toBe('1.2.1.1')
  })

  it('rejeita mover um nó para si mesmo ou para um descendente (ciclo)', () => {
    const tree = plainTree()
    expect(moveNode(tree, 'f1', 'f1')).toBe(tree)
    expect(moveNode(tree, 'f1', 'p11')).toBe(tree)
    expect(moveNode(tree, 'r', 'f1')).toBe(tree)
  })

  it('move para root (targetParentId null) como segunda raiz', () => {
    const out = moveNode(plainTree(), 'p21', null)
    expect(out.length).toBe(2)
    expect(out.map(x => x.code)).toEqual(['1', '2'])
    expect(out[1].id).toBe('p21')
    expect(out[1].parentId).toBeNull()
    expect(out[1].children).toEqual([])
  })

  it('respeita targetOrder ao inserir entre irmãos', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A'), n('b', 'B'), n('c', 'C')])]
    const out = moveNode(tree, 'c', 'r', 0)
    expect(out[0].children.map(c => c.id)).toEqual(['c', 'a', 'b'])
    expect(out[0].children.map(c => c.code)).toEqual(['1.1', '1.2', '1.3'])
  })

  it('nó inexistente → devolve a mesma árvore', () => {
    const tree = plainTree()
    expect(moveNode(tree, 'nao-existe', 'r')).toBe(tree)
  })
})

describe('moveNodeRelative', () => {
  const tree = [n('r', 'Projeto', [n('a', 'A'), n('b', 'B'), n('c', 'C')])]

  it('move para cima (-1)', () => {
    const out = moveNodeRelative(tree, 'c', -1)
    expect(out[0].children.map(x => x.id)).toEqual(['a', 'c', 'b'])
    expect(out[0].children.map(x => x.code)).toEqual(['1.1', '1.2', '1.3'])
  })

  it('move para baixo (+1)', () => {
    const out = moveNodeRelative(tree, 'a', 1)
    expect(out[0].children.map(x => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('não sai da borda — primeiro elemento acima ou último abaixo ficam como estão', () => {
    expect(moveNodeRelative(tree, 'a', -1)).toBe(tree)
    expect(moveNodeRelative(tree, 'c', 1)).toBe(tree)
  })

  it('nó inexistente → devolve a mesma árvore', () => {
    expect(moveNodeRelative(tree, 'nao-existe', -1)).toBe(tree)
  })
})

describe('updateTitle', () => {
  it('atualiza o título preservando códigos e estrutura', () => {
    const tree = plainTree()
    const out = updateTitle(tree, 'p11', 'Nova entrega')
    const found = flattenTree(out).find(x => x.id === 'p11')
    expect(found?.title).toBe('Nova entrega')
    expect(found?.code).toBe('1.1.1')
    expect(out[0].code).toBe('1')
    expect(tree[0].children[0].children[0].title).toBe('Pacote A1') // imutável
  })

  it('nó inexistente → devolve árvore equivalente, sem erro', () => {
    expect(updateTitle(plainTree(), 'nao-existe', 'X')[0].children.length).toBe(3)
  })
})

describe('findParentId / listCandidateParents', () => {
  it('findParentId retorna o pai imediato (null para raiz)', () => {
    expect(findParentId(plainTree(), 'p11')).toBe('f1')
    expect(findParentId(plainTree(), 'f2')).toBe('r')
    expect(findParentId(plainTree(), 'r')).toBeNull()
  })

  it('listCandidateParents exclui o próprio nó e seus descendentes', () => {
    const ids = listCandidateParents(plainTree(), 'f1').map(x => x.id)
    expect(new Set(ids)).toEqual(new Set(['r', 'p21', 'p22', 'f2', 'f3']))
    expect(ids).not.toContain('f1')
    expect(ids).not.toContain('p11')
  })

  it('a raiz não é candidata a pai de si mesma', () => {
    const ids = listCandidateParents(plainTree(), 'r').map(x => x.id)
    expect(ids).toHaveLength(0)
  })
})