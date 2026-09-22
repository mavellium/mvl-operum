/**
 * Tipos do módulo EAP — Estrutura Analítica do Projeto (template documental).
 *
 * Modelo de dados sugerido na SPEC §16: um Template protegido atua como matriz
 * e cada documento (por projeto) é uma cópia independente e editável.
 *
 * A árvore é armazenada como JSON aninhado (`EapNode[]` de raízes). `order` é a
 * FONTE DE VERDADE da ordenação; `code`, `level` e `parentId` são DERIVADOS e
 * recalculados pelo servidor (lib/eapCode.ts) a cada persistência — o cliente
 * nunca define códigos manualmente.
 */

/** Nó da árvore da EAP. Estrutura aninhada: filhos dentro de `children`. */
export interface EapNode {
  id: string
  /** DERIVADO — pai imediato (recalculado pelo servidor). `null` para raízes. */
  parentId: string | null
  /** DERIVADO — "1", "1.2", "1.2.1"... recalculado pelo servidor. */
  code: string
  /** Título editável do nó (ex.: "[ENTREGA / FASE]"). */
  title: string
  /** DERIVADO — profundidade (raiz = 1). */
  level: number
  /** posição 0-based entre irmãos — FONTE DE VERDADE da ordenação. */
  order: number
  /** Sub-árvore. */
  children: EapNode[]
}

/** Template documental (matriz) — protegido, não editado pelos usuários. */
export interface EapTemplate {
  id: string
  name: string
  version: string
  description?: string | null
  isActive: boolean
  /** Estrutura inicial (placeholders) usada para criar novos documentos. */
  structure: EapNode[]
  createdAt: string
  updatedAt: string
}

/** Documento EAP — instância independente criada a partir do template. */
export interface EapDocument {
  id: string
  projectId: string
  tenantId: string
  templateId: string

  projectName: string
  projectManager: string
  preparedBy: string
  version: string
  approvedBy: string
  signature: string
  /** yyyy-mm-dd (string p/ evitar viés de fuso, padrão do app). */
  approvalDate: string | null

  nodes: EapNode[]

  createdAt: string
  updatedAt: string
}

/** Metadados editáveis do documento (sem a árvore). */
export type EapDocumentMetadata = Pick<
  EapDocument,
  | 'projectName'
  | 'projectManager'
  | 'preparedBy'
  | 'version'
  | 'approvedBy'
  | 'signature'
  | 'approvalDate'
>

/** Geometria de um bloco na página gráfica (layout fixo de impressão). */
export interface EapNodeGeometry {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** True para o nó raiz (apresentação com "1 — Título"). */
  isRoot: boolean
}

/** Conector entre dois blocos, pronto para pintura no SVG. */
export interface EapConnector {
  fromId: string
  toId: string
  path: string
}

export interface EapLayoutResult {
  geometry: Record<string, EapNodeGeometry>
  connectors: EapConnector[]
  bounds: { width: number; height: number }
}