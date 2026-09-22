import { v4 as uuidv4 } from 'uuid'
import type { EapNode } from '@/types/eap'
import { recomputeNodeCodes } from './eapCode'

/**
 * Estrutura INICIAL do template EAP (SPEC §26).
 *
 * Corresponde ao número de níveis e à quantidade de blocos do documento de
 * referência, SEM carregar os conteúdos do projeto "Girassol em ação":
 *
 *   1 — [NOME DO PROJETO]
 *   1.1 [ENTREGA / FASE]        → 1.1.1 / 1.1.2 / 1.1.3
 *   1.2 [ENTREGA / FASE]        → 1.2.1 / 1.2.2
 *   1.3 [ENTREGA / FASE]        → 1.3.1
 *   1.4 [ENTREGA / FASE]        → 1.4.1 / 1.4.2
 *   1.5 [ENTREGA / FASE]        → 1.5.1
 *   1.6 [ENTREGA / FASE]        → 1.6.1 / 1.6.2
 *
 * Os títulos são placeholders editáveis; os códigos são derivados da posição.
 */

export const EAP_TEMPLATE_NAME = 'Estrutura Analítica do Projeto — EAP'
export const EAP_TEMPLATE_DESCRIPTION =
  'Modelo documental de Estrutura Analítica do Projeto (EAP) em duas páginas: ' +
  'representação gráfica (organograma) e representação textual. ' +
  'O template é uma matriz — cada documento é uma cópia independente e editável.'

const PHASE = '[ENTREGA / FASE]'
const PACKAGE = '[PACOTE DE TRABALHO]'

function makeNode(title: string, children: EapNode[] = [], idFactory: () => string = uuidv4): EapNode {
  return {
    id: idFactory(),
    parentId: null,
    code: '',
    title,
    level: 1,
    order: 0,
    children,
  }
}

function packageNode(count: number, idFactory: () => string): EapNode[] {
  return Array.from({ length: count }, () => makeNode(PACKAGE, [], idFactory))
}

/** Gera a estrutura padrão do template (normalizada, códigos corretos). */
export function createDefaultStructure(idFactory: () => string = uuidv4): EapNode[] {
  const phases = [
    makeNode(PHASE, packageNode(3, idFactory), idFactory),
    makeNode(PHASE, packageNode(2, idFactory), idFactory),
    makeNode(PHASE, packageNode(1, idFactory), idFactory),
    makeNode(PHASE, packageNode(2, idFactory), idFactory),
    makeNode(PHASE, packageNode(1, idFactory), idFactory),
    makeNode(PHASE, packageNode(2, idFactory), idFactory),
  ]

  const root = makeNode('[NOME DO PROJETO]', phases, idFactory)
  return recomputeNodeCodes([root])
}

/** Clona a estrutura do template, gerando ids novos (documento independente). */
export function structureFromTemplate(templateStructure: EapNode[], idFactory: () => string = uuidv4): EapNode[] {
  const cloneTree = (nodes: EapNode[]): EapNode[] =>
    nodes.map(node => ({
      id: idFactory(),
      parentId: null,
      code: '',
      title: node.title,
      level: 1,
      order: 0,
      children: cloneTree(node.children ?? []),
    }))
  return recomputeNodeCodes(cloneTree(templateStructure))
}