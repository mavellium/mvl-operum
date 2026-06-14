'use client'

import { type Dispatch } from 'react'
import { exportMspdi } from '@/lib/wbsExportMspdi'
import { exportWbsSvg, exportWbsPng } from '@/lib/wbsExportSvg'
import type { WbsAction } from '@/lib/wbsReducer'
import type { WbsNodeClient } from '@/types/wbs'

interface WbsToolbarProps {
  syncStatus: 'IDLE' | 'DIRTY' | 'SAVING' | 'ERROR' | 'CONFLICT'
  lastSavedAt: number | null
  zoom: number
  canUndo: boolean
  canRedo: boolean
  canEdit: boolean
  nodes: Record<string, WbsNodeClient>
  rootId: string | null
  selectedNodeIds: string[]
  projetoId: string
  dispatch: Dispatch<WbsAction>
  onFitScreen: () => void
  onManualSave: () => void
  onResetTree: () => void
}

const SYNC_LABEL: Record<string, { label: string; color: string }> = {
  IDLE: { label: 'Salvo', color: '#16a34a' },
  DIRTY: { label: 'Não salvo', color: '#d97706' },
  SAVING: { label: 'Salvando…', color: '#3b82f6' },
  ERROR: { label: 'Erro ao salvar', color: '#dc2626' },
  CONFLICT: { label: 'Conflito!', color: '#7c3aed' },
}

function Btn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 font-medium"
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

export default function WbsToolbar({
  syncStatus, lastSavedAt, zoom, canUndo, canRedo, canEdit,
  nodes, rootId, selectedNodeIds, projetoId,
  dispatch, onFitScreen, onManualSave, onResetTree,
}: WbsToolbarProps) {
  const firstSelected = selectedNodeIds[0]
  const selectedNode = firstSelected ? nodes[firstSelected] : null

  const handleExportWbs = () => {
    const data = JSON.stringify({ version: 1, rootId, nodes }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `eap-${projetoId}.wbs`
    a.click()
  }

  const handleExportMspdi = () => {
    const xml = exportMspdi(nodes, rootId, { projectName: projetoId })
    if (!xml) return
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `eap-${projetoId}.xml`
    a.click()
  }

  const handleExportSvg = () => exportWbsSvg(nodes, rootId, `eap-${projetoId}.svg`)

  const handleExportPng = () => exportWbsPng(nodes, rootId, `eap-${projetoId}.png`)

  const zoomPercent = Math.round(zoom * 100)
  const sync = SYNC_LABEL[syncStatus] ?? SYNC_LABEL.IDLE

  return (
    <div data-wbs-toolbar="" className="flex items-center gap-1 px-3 h-10 border-b border-gray-200 bg-white shrink-0 overflow-x-auto">
      {/* Edit */}
      <Btn onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} title="Desfazer (Ctrl+Z)">⟲</Btn>
      <Btn onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)">⟳</Btn>

      <Sep />

      {/* Insert */}
      {canEdit && (
        <>
          <Btn
            onClick={() => firstSelected && dispatch({ type: 'INSERT_CHILD', payload: { parentId: firstSelected } })}
            disabled={!firstSelected}
            title="Inserir filho (Tab)"
          >
            + Filho
          </Btn>
          <Btn
            onClick={() => firstSelected && selectedNode?.parentId && dispatch({ type: 'INSERT_SIBLING', payload: { siblingId: firstSelected } })}
            disabled={!firstSelected || !selectedNode?.parentId}
            title="Inserir irmão (Enter)"
          >
            + Irmão
          </Btn>
          <Btn
            onClick={() => firstSelected && dispatch({ type: 'DELETE_NODE', payload: { nodeId: firstSelected } })}
            disabled={!firstSelected || !selectedNode?.parentId}
            title="Excluir nó (Delete)"
          >
            <span className="text-red-500">🗑</span>
          </Btn>
        </>
      )}

      <Sep />

      {/* Layout options for selected node */}
      {canEdit && firstSelected && (
        <>
          {(['LADO_A_LADO', 'ABAIXO', 'ABAIXO_L'] as const).map(layout => (
            <Btn
              key={layout}
              onClick={() => dispatch({ type: 'SET_LAYOUT', payload: { nodeId: firstSelected, layout } })}
              title={`Layout: ${layout}`}
            >
              <span className={selectedNode?.layout === layout ? 'text-blue-600 font-bold' : ''}>
                {layout === 'LADO_A_LADO' ? '⇄' : layout === 'ABAIXO' ? '⇅' : '⌐'}
              </span>
            </Btn>
          ))}
          <Sep />
        </>
      )}

      {/* Zoom */}
      <Btn onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: Math.max(0.1, zoom / 1.2), panX: 40, panY: 40 } })} title="Zoom −">−</Btn>
      <span className="text-xs text-gray-500 w-12 text-center tabular-nums">{zoomPercent}%</span>
      <Btn onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: Math.min(3, zoom * 1.2), panX: 40, panY: 40 } })} title="Zoom +">+</Btn>
      <Btn onClick={onFitScreen} title="Ajustar à tela">⤢</Btn>
      <Btn onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: 1, panX: 40, panY: 40 } })} title="100%">100%</Btn>

      <Sep />

      {/* Export */}
      <Btn onClick={handleExportWbs} title="Exportar .wbs">📥 .wbs</Btn>
      <Btn onClick={handleExportMspdi} title="Exportar MS Project XML">📥 MSPDI</Btn>
      <Btn onClick={handleExportSvg} title="Exportar SVG">📥 SVG</Btn>
      <Btn onClick={handleExportPng} title="Exportar PNG (2×)">📥 PNG</Btn>
      <Btn onClick={() => window.print()} title="Imprimir EAP">🖨 Imprimir</Btn>

      {canEdit && (
        <>
          <Sep />
          <Btn onClick={onResetTree} title="Novo documento (apaga tudo)">🗎 Novo</Btn>
          <Btn onClick={onManualSave} disabled={syncStatus === 'SAVING'} title="Salvar agora (Ctrl+S)">💾 Salvar</Btn>
        </>
      )}

      {/* Spacer + sync status */}
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 text-xs" title={lastSavedAt ? `Último save: ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : undefined}>
        <span style={{ color: sync.color }}>●</span>
        <span className="text-gray-500">{sync.label}</span>
      </div>
    </div>
  )
}
