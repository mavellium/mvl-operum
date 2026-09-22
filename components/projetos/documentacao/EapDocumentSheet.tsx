'use client'

import { forwardRef, useMemo } from 'react'
import type { EapNode, EapDocumentMetadata } from '@/types/eap'
import { computeEapLayout, fitScale } from '@/lib/eapLayout'
import { flattenTree } from '@/lib/eapCode'
import { formatDateBR } from '@/lib/date'

/**
 * Folha A4 do documento EAP (SPEC §5–§8, §12).
 *
 * PÁGINA 1 — EAP GRÁFICA: cabeçalho institucional, informações do projeto e a
 *   árvore em organograma (caixas + conectores).
 * PÁGINA 2 — EAP TEXTUAL: mesmo cabeçalho e a EAP gerada automaticamente a
 *   partir da MESMA árvore de dados (nunca há duas EAPs independentes).
 *
 * `ref` é usado pelo react-to-print para exportar o PDF com layout fixo A4.
 */

export interface EapDocumentSheetProps {
  metadata: EapDocumentMetadata
  nodes: EapNode[]
  instituicao: string
  /** Habilita interação (clique nos blocos) — usado pelo editor. */
  interactive?: boolean
  selectedId?: string | null
  onSelectBlock?: (id: string) => void
}

// ── Constantes de página (mm→px: 1mm ≈ 3.7795px) ────────────────────────────
const PAGE_W = 210
const PAGE_H = 297
const PAD_X = 16
const PAD_Y = 14

const MM = 3.7795
const CONTENT_W = (PAGE_W - PAD_X * 2) * MM

// Estilos fixos do documento (layout de impressão, não responsivo)
const pageStyle: React.CSSProperties = {
  width: `${PAGE_W}mm`,
  height: `${PAGE_H}mm`,
  padding: `${PAD_Y}mm ${PAD_X}mm`,
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f172a',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '9.5pt',
  lineHeight: 1.35,
  overflow: 'hidden',
  position: 'relative',
}

const headerTitleStyle: React.CSSProperties = {
  fontSize: '13pt',
  fontWeight: 700,
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const institucionalStyle: React.CSSProperties = {
  fontSize: '8.5pt',
  textAlign: 'center',
  color: '#334155',
  marginTop: 2,
  marginBottom: 10,
  textTransform: 'uppercase',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '8pt',
  fontWeight: 700,
  color: '#334155',
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
}

const fieldValueStyle: React.CSSProperties = {
  fontSize: '9pt',
  color: '#0f172a',
  borderBottom: '1px solid #475569',
  minWidth: 42,
  padding: '1px 2px 2px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '10pt',
  fontWeight: 700,
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: '1.5px solid #334155',
  paddingBottom: 4,
  marginBottom: 10,
}

/** Quebra aproximada de palavras para caber na largura do bloco. */
function wrapText(text: string, maxChars: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  // Máximo de 2 linhas visíveis — texto longo vira elipse.
  const kept = lines.slice(0, 2)
  const overflow = lines.length > 2
  return kept.map((l, i) =>
    overflow && i === kept.length - 1 && l.length >= maxChars - 1 ? `${l.slice(0, maxChars - 2).trimEnd()}…` : l,
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <td style={{ padding: '2px 6px', verticalAlign: 'bottom', textAlign: 'left' }}>
      <span style={fieldLabelStyle}>{label}:</span>
      <span style={fieldValueStyle}>{value}</span>
    </td>
  )
}

const EapDocumentSheet = forwardRef<HTMLDivElement, EapDocumentSheetProps>(
  function EapDocumentSheet({ metadata, nodes, instituicao, interactive, selectedId, onSelectBlock }, ref) {
    const layout = useMemo(() => computeEapLayout(nodes), [nodes])
    const flat = useMemo(() => flattenTree(nodes), [nodes])

    // Área disponível para a árvore (após cabeçalho + título da seção)
    const TREE_AVAIL_H = 186 * MM
    const scale = fitScale(layout.bounds.width, layout.bounds.height || 1, CONTENT_W, TREE_AVAIL_H)
    const svgW = layout.bounds.width * scale
    const svgH = (layout.bounds.height || 1) * scale

    const maxChars = 22
    const root = nodes[0]

    function renderHeader(title: string) {
      return (
        <div style={{ marginBottom: 12 }}>
          <div style={headerTitleStyle}>{title}</div>
          <div style={institucionalStyle}>{instituicao}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <FieldRow label="Nome do projeto" value={metadata.projectName} />
                <FieldRow label="Gerente do projeto" value={metadata.projectManager} />
              </tr>
              <tr>
                <FieldRow label="Elaborado por" value={metadata.preparedBy} />
                <FieldRow label="Versão" value={metadata.version || '1.0'} />
              </tr>
              <tr>
                <FieldRow label="Aprovado por" value={metadata.approvedBy} />
                <FieldRow label="Assinatura" value={metadata.signature} />
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: '2px 6px', verticalAlign: 'bottom' }}>
                  <span style={fieldLabelStyle}>Data de aprovação:</span>
                  <span style={fieldValueStyle}>{formatDateBR(metadata.approvalDate, '')}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    function renderGraphicTree() {
      if (nodes.length === 0) {
        return (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', paddingTop: 40 }}>
            Estrutura da EAP vazia — use o editor para montar a árvore.
          </div>
        )
      }
      return (
        <svg
          viewBox={`0 0 ${layout.bounds.width} ${layout.bounds.height}`}
          width={svgW}
          height={svgH}
          style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
          role="tree"
        >
          {/* Conectores */}
          {layout.connectors.map((c, i) => (
            <path
              key={`${c.fromId}-${c.toId}-${i}`}
              d={c.path}
              fill="none"
              stroke="#334155"
              strokeWidth={1.6}
            />
          ))}

          {/* Blocos */}
          {flat.map(node => {
            const g = layout.geometry[node.id]
            if (!g) return null
            const isRoot = Boolean(g.isRoot)
            const selected = interactive && selectedId === node.id
            const lines = wrapText(node.title, maxChars)

            return (
              <g
                key={node.id}
                role="treeitem"
                aria-level={node.level}
                aria-selected={selected}
                onClick={interactive ? () => onSelectBlock?.(node.id) : undefined}
                style={interactive ? { cursor: 'pointer' } : undefined}
              >
                <rect
                  x={g.x}
                  y={g.y}
                  width={g.width}
                  height={g.height}
                  fill="#ffffff"
                  stroke={selected ? '#2563eb' : '#1e293b'}
                  strokeWidth={selected ? 2.5 : 1.4}
                  rx={3}
                />
                <text
                  x={g.x + g.width / 2}
                  y={g.y + 13}
                  textAnchor="middle"
                  fontSize={isRoot ? 11 : 9.5}
                  fontWeight={700}
                  fill="#334155"
                >
                  {isRoot ? `${node.code} —` : node.code}
                </text>
                <text
                  x={g.x + g.width / 2}
                  y={g.y + (isRoot ? 30 : 30)}
                  textAnchor="middle"
                  fontSize={isRoot ? 9.5 : 8.5}
                  fontWeight={600}
                  fill="#0f172a"
                  style={{ textTransform: 'uppercase' }}
                >
                  {lines[0]}
                </text>
                {lines[1] !== undefined && (
                  <text
                    x={g.x + g.width / 2}
                    y={g.y + (isRoot ? 39 : 39)}
                    textAnchor="middle"
                    fontSize={isRoot ? 9.5 : 8.5}
                    fontWeight={600}
                    fill="#0f172a"
                    style={{ textTransform: 'uppercase' }}
                  >
                    {lines[1]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )
    }

    function renderTextualTree() {
      if (flat.length === 0) {
        return (
          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            Estrutura da EAP vazia — use o editor para montar a árvore.
          </div>
        )
      }
      return (
        <div>
          {flat.map(node => {
            const hasChildren = (node.children?.length ?? 0) > 0
            const isRootLevel = node.level === 1
            const text = isRootLevel ? `${node.code}- ${node.title.toUpperCase()}` : `${node.code} ${node.title.toUpperCase()}`
            return (
              <div
                key={node.id}
                style={{
                  marginLeft: node.level > 2 ? (node.level - 2) * 26 : 0,
                  marginTop: 2,
                  marginBottom: hasChildren ? 10 : 2,
                  fontSize: isRootLevel ? '11pt' : '9.5pt',
                  fontWeight: isRootLevel ? 700 : 500,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-testid="eap-sheet"
        className="eap-sheet"
        style={{ width: `${PAGE_W}mm`, fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* ── PÁGINA 1 — EAP GRÁFICA ─────────────────────────────────────── */}
        <div className="eap-page eap-page-1" style={{ ...pageStyle, pageBreakAfter: 'always' }}>
          {renderHeader('Modelo de Estrutura Analítica do Projeto (EAP - Gráfica)')}
          {root && (
            <div style={{ ...sectionTitleStyle, marginTop: 4 }}>
              Estrutura Analítica do Projeto — Gráfica
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center' }}>{renderGraphicTree()}</div>
        </div>

        {/* ── PÁGINA 2 — EAP TEXTUAL ─────────────────────────────────────── */}
        <div className="eap-page eap-page-2" style={pageStyle}>
          {renderHeader('Modelo de Estrutura Analítica do Projeto (EAP - Texto)')}
          <div style={{ ...sectionTitleStyle, marginTop: 4 }}>
            Estrutura Analítica do Projeto — Texto
          </div>
          {renderTextualTree()}
        </div>
      </div>
    )
  },
)

EapDocumentSheet.displayName = 'EapDocumentSheet'
export default EapDocumentSheet