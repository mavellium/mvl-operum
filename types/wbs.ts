export type WbsLayoutOrientation = 'LADO_A_LADO' | 'ABAIXO' | 'ABAIXO_L';
export type ClipboardActionType = 'COPY' | 'CUT' | null;
export type DropPosition = 'INSIDE' | 'BEFORE' | 'AFTER';

export interface WbsNodeStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  borderWidth: number;
  fontSize: number;
  borderRadius: number;
}

export interface WbsNodeProperties {
  /** INPUT só em folhas; em nós-pai o valor é derivado (rollup). >= 0 */
  cost?: number;
  /** INPUT só em folhas; rollup soma os filhos. >= 0 */
  durationDays?: number;
  /** referência a UserProject ativo */
  ownerUserId?: string;
  description?: string;
}

/** Valores derivados (não persistidos) — calculados por lib/wbsRollup.ts */
export interface WbsRollup {
  cost: number;
  durationDays: number;
  isRolledUp: boolean;
}

export interface WbsNodeClient {
  id: string;
  parentId: string | null;
  /** posição 0-based entre irmãos — FONTE DE VERDADE da ordenação */
  order: number;
  /** derivado; recalculado pelo servidor */
  code: string;
  title: string;
  layout: WbsLayoutOrientation;
  collapsed: boolean;
  style: WbsNodeStyle;
  properties: WbsNodeProperties;
  /** IDs dos filhos ORDENADOS por `order` */
  childrenIds: string[];
}

export interface WbsNodeGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WbsConnector {
  fromId: string;
  toId: string;
  path: string;
}

export interface WbsLayoutResult {
  geometry: Record<string, WbsNodeGeometry>;
  connectors: WbsConnector[];
  bounds: { width: number; height: number };
}

/** client-only */
export interface WbsViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface WbsHistoryEntry {
  nodes: Record<string, WbsNodeClient>;
  rootId: string | null;
}

export interface WbsTreeState {
  nodes: Record<string, WbsNodeClient>;
  rootId: string | null;
  selectedNodeIds: string[];
  /** edição inline em andamento */
  editingNodeId: string | null;
  /** texto inicial da edição inline (digitação substitui o título) */
  editingInitialText?: string;
  /** nó recém-criado que o canvas deve centralizar (limpo após o pan) */
  focusNodeId: string | null;
  clipboard: {
    nodes: WbsNodeClient[];
    copiedStyle: WbsNodeStyle | null;
    actionType: ClipboardActionType;
  };
  history: {
    past: WbsHistoryEntry[];
    future: WbsHistoryEntry[];
  };
  viewport: WbsViewport;
  sync: {
    status: 'IDLE' | 'DIRTY' | 'SAVING' | 'ERROR' | 'CONFLICT';
    lastSavedAt: number | null;
    serverVersion: number;
  };
}
