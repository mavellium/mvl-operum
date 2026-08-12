'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// useLayoutEffect no cliente (mede antes do paint), useEffect no servidor (no-op em SSR)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
import { computeLayout, NODE_W, NODE_H } from '@/lib/wbsLayout'
import type { WbsNodeClient } from '@/types/wbs'
import { computeRollups } from '@/lib/wbsRollup'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { WbsProvider, useWbs } from './WbsContext'
import WbsMenubar from './WbsMenubar'
import WbsNodeCard from './WbsNode'
import WbsPropertiesPanel from './WbsPropertiesPanel'
import { saveTreeAction } from '@/app/actions/wbs'
import type { GetTreeResult } from '@/services/wbsService'
import type { DropPosition } from '@/types/wbs'

const SCROLL_SPEED = 1.0

/** Mede a largura do texto de cada nó via Canvas API (browser-only, sem DOM manipulation). */
function measureNodeWidths(nodes: Record<string, WbsNodeClient>): Record<string, number> {
  if (typeof document === 'undefined') return {}
  const PADDING_H = 32
  const MIN_W = 120
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontFamily = getComputedStyle(document.body).fontFamily
  const widths: Record<string, number> = {}
  for (const node of Object.values(nodes)) {
    ctx.font = `500 ${node.style.fontSize}px ${fontFamily}`
    const textW = ctx.measureText(`${node.code} ${node.title}`).width
    widths[node.id] = Math.max(MIN_W, textW + PADDING_H)
  }
  return widths
}

export interface WbsCanvasProps {
  projetoId: string
  tenantId: string
  userId: string
  canEdit: boolean
  initialTree: GetTreeResult
}

interface DragState {
  nodeId: string
  x: number
  y: number
  targetId: string | null
  targetPos: DropPosition | null
}

interface PendingDrag {
  nodeId: string
  startX: number
  startY: number
}

function WbsCanvasInner({ projetoId, canEdit }: { projetoId: string; canEdit: boolean }) {
  const { state, dispatch } = useWbs()
  const { toast } = useToast()

  const stateRef = useRef(state)
  useIsomorphicLayoutEffect(() => { stateRef.current = state }, [state])

  const canvasRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNodesRef = useRef(state.nodes)
  // Track pending pointer-down to distinguish click vs. drag (no capture until 4 px moved)
  const pendingDragRef = useRef<PendingDrag | null>(null)
  const hasInitiallyCenteredRef = useRef(false)

  const spaceDownRef = useRef(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panningRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const pendingPanRef = useRef<{ startX: number; startY: number } | null>(null)

  const [drag, setDrag] = useState<DragState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showStylePanel, setShowStylePanel] = useState(false)

  // O painel de estilo só deve aparecer enquanto houver seleção — some junto com ela.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.selectedNodeIds.length === 0) setShowStylePanel(false)
  }, [state.selectedNodeIds])

  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({})
  useIsomorphicLayoutEffect(() => { setNodeWidths(measureNodeWidths(state.nodes)) }, [state.nodes])
  const layout = useMemo(() => computeLayout(state.nodes, state.rootId, nodeWidths), [state.nodes, state.rootId, nodeWidths])
  const rollups = useMemo(() => computeRollups(state.nodes, state.rootId), [state.nodes, state.rootId])

  const firstSelectedId = state.selectedNodeIds[0]
  const selectedNode = firstSelectedId ? state.nodes[firstSelectedId] : null

  // ── Autosave ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.nodes === prevNodesRef.current) return
    prevNodesRef.current = state.nodes
    if (!canEdit) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const s = stateRef.current
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'SAVING' } })
      const res = await saveTreeAction({ projetoId, serverVersion: s.sync.serverVersion, rootId: s.rootId, nodes: s.nodes })
      if (res.ok) {
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'IDLE', serverVersion: res.serverVersion, lastSavedAt: Date.now() } })
      } else if (res.conflict) {
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'CONFLICT' } })
        toast('Conflito: esta EAP foi editada por outra pessoa. Recarregue a página.', 'warning')
      } else {
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'ERROR' } })
        toast(res.error || 'Erro ao salvar automaticamente', 'error')
      }
    }, 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [state.nodes, canEdit, projetoId, dispatch, toast])

  // ── Save helpers ────────────────────────────────────────────────────────────
  const handleManualSave = useCallback(async () => {
    if (!canEdit) return
    const s = stateRef.current
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'SAVING' } })
    const res = await saveTreeAction({ projetoId, serverVersion: s.sync.serverVersion, rootId: s.rootId, nodes: s.nodes })
    if (res.ok) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'IDLE', serverVersion: res.serverVersion, lastSavedAt: Date.now() } })
      toast('EAP salva com sucesso', 'success')
    } else {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: res.conflict ? 'CONFLICT' : 'ERROR' } })
      toast(res.error || 'Erro ao salvar', 'error')
    }
  }, [canEdit, projetoId, dispatch, toast])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      const s = stateRef.current
      const sel = s.selectedNodeIds[0]
      const ctrl = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        if (s.editingNodeId) dispatch({ type: 'SET_EDITING', payload: { nodeId: null } })
        else if (showStylePanel) setShowStylePanel(false)
        else dispatch({ type: 'SET_SELECTION', payload: { nodeIds: [] } })
        return
      }
      if (isInput) return

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }) }
      else if (ctrl && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); dispatch({ type: 'REDO' }) }
      else if (ctrl && e.key === 's') { e.preventDefault(); handleManualSave() }
      else if (ctrl && e.key === 'a') { e.preventDefault(); dispatch({ type: 'SET_SELECTION', payload: { nodeIds: Object.keys(s.nodes) } }) }
      else if (ctrl && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); if (sel) dispatch({ type: 'COPY_STYLE', payload: { nodeId: sel } }) }
      else if (ctrl && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault()
        if (s.clipboard.copiedStyle && s.selectedNodeIds.length > 0) {
          dispatch({ type: 'PASTE_STYLE_TO_SELECTED' })
          toast(`Estilo aplicado a ${s.selectedNodeIds.length} elemento(s)`, 'success')
        }
      }
      else if (ctrl && e.key === '0') { e.preventDefault(); const vp = s.viewport; dispatch({ type: 'SET_VIEWPORT', payload: { zoom: 1, panX: vp.panX, panY: vp.panY } }) }
      else if (!sel) return
      else if (e.key === 'Tab') { e.preventDefault(); dispatch({ type: 'INSERT_CHILD', payload: { parentId: sel } }) }
      else if (e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'INSERT_SIBLING', payload: { siblingId: sel } }) }
      else if (e.key === 'F2') { e.preventDefault(); dispatch({ type: 'SET_EDITING', payload: { nodeId: sel } }) }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (s.nodes[sel]?.parentId) setConfirmDelete(true) }
      else if (ctrl && e.key === 'c') { e.preventDefault(); dispatch({ type: 'COPY', payload: { nodeIds: s.selectedNodeIds } }) }
      else if (ctrl && e.key === 'x') { e.preventDefault(); dispatch({ type: 'CUT', payload: { nodeIds: s.selectedNodeIds } }) }
      else if (ctrl && e.key === 'v') { e.preventDefault(); dispatch({ type: 'PASTE', payload: { parentId: sel } }) }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [dispatch, showStylePanel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Space key tracking (pan cursor) ────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      e.preventDefault()
      if (!spaceDownRef.current) { spaceDownRef.current = true; setSpaceDown(true) }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      spaceDownRef.current = false
      setSpaceDown(false)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [])

  // ── Wheel → pan/zoom (passive:false para permitir preventDefault) ───────────
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const vp = stateRef.current.viewport
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const f = e.deltaY < 0 ? 1.15 : 1 / 1.15
        const newZoom = Math.min(3, Math.max(0.1, vp.zoom * f))
        dispatch({ type: 'SET_VIEWPORT', payload: { zoom: newZoom, panX: mx - (mx - vp.panX) * (newZoom / vp.zoom), panY: my - (my - vp.panY) * (newZoom / vp.zoom) } })
      } else if (e.shiftKey) {
        // Shift+scroll de mouse → horizontal (deltaX é 0, usa deltaY como eixo H)
        dispatch({ type: 'SET_VIEWPORT', payload: { ...vp, panX: vp.panX - e.deltaY * SCROLL_SPEED } })
      } else {
        // Scroll normal ou trackpad: aplica X e Y simultaneamente
        dispatch({ type: 'SET_VIEWPORT', payload: { ...vp, panX: vp.panX - e.deltaX * SCROLL_SPEED, panY: vp.panY - e.deltaY * SCROLL_SPEED } })
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [dispatch])

  // ── Fit to screen (centered with padding=40) ──────────────────────────────
  const fitToScreen = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !layout.bounds.width || !layout.bounds.height) return
    const PAD = 40
    const zoom = Math.min(1, Math.min(
      (rect.width - PAD * 2) / layout.bounds.width,
      (rect.height - PAD * 2) / layout.bounds.height,
    ))
    const panX = (rect.width - layout.bounds.width * zoom) / 2
    const panY = (rect.height - layout.bounds.height * zoom) / 2
    dispatch({ type: 'SET_VIEWPORT', payload: { zoom, panX, panY } })
  }, [layout.bounds, dispatch])

  // ── Center tree on first render (once bounds are known) ───────────────────
  useEffect(() => {
    if (hasInitiallyCenteredRef.current || !layout.bounds.width || !layout.bounds.height) return
    hasInitiallyCenteredRef.current = true
    requestAnimationFrame(() => fitToScreen())
  }, [layout.bounds, fitToScreen])

  // ── Node selection (multi-select via Ctrl/Cmd+click) ──────────────────────
  const handleNodeSelect = useCallback((nodeId: string, multi: boolean) => {
    const s = stateRef.current
    if (multi) {
      const already = s.selectedNodeIds.includes(nodeId)
      dispatch({
        type: 'SET_SELECTION',
        payload: { nodeIds: already ? s.selectedNodeIds.filter(id => id !== nodeId) : [...s.selectedNodeIds, nodeId] },
      })
    } else {
      dispatch({ type: 'SET_SELECTION', payload: { nodeIds: [nodeId] } })
    }
  }, [dispatch])

  // ── DnD — click vs. drag distinguished by 4 px movement threshold ─────────
  // We do NOT call setPointerCapture on pointerdown; this allows native
  // click / dblclick events to fire on the node elements normally.
  // Capture is only set once movement exceeds the threshold (actual drag).
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Middle button OR Space+left → pan
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault()
      const vp = stateRef.current.viewport
      panningRef.current = { startX: e.clientX, startY: e.clientY, startPanX: vp.panX, startPanY: vp.panY }
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsPanning(true)
      return
    }
    if (e.button !== 0) return
    let el = e.target as HTMLElement | null
    while (el && !el.dataset.nodeId) el = el.parentElement
    if (el?.dataset.nodeId) {
      pendingDragRef.current = { nodeId: el.dataset.nodeId, startX: e.clientX, startY: e.clientY }
    } else {
      pendingPanRef.current = { startX: e.clientX, startY: e.clientY }
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (panningRef.current) {
      const { startX, startY, startPanX, startPanY } = panningRef.current
      dispatch({ type: 'SET_VIEWPORT', payload: { ...stateRef.current.viewport, panX: startPanX + e.clientX - startX, panY: startPanY + e.clientY - startY } })
      return
    }
    if (pendingPanRef.current) {
      const dx = e.clientX - pendingPanRef.current.startX
      const dy = e.clientY - pendingPanRef.current.startY
      if (dx * dx + dy * dy > 16) {
        const vp = stateRef.current.viewport
        panningRef.current = { startX: pendingPanRef.current.startX, startY: pendingPanRef.current.startY, startPanX: vp.panX, startPanY: vp.panY }
        pendingPanRef.current = null
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsPanning(true)
      }
      return
    }
    const pending = pendingDragRef.current
    if (pending && !drag) {
      const dx = e.clientX - pending.startX
      const dy = e.clientY - pending.startY
      if (dx * dx + dy * dy > 16 && canEdit && stateRef.current.nodes[pending.nodeId]?.parentId) {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ nodeId: pending.nodeId, x: e.clientX, y: e.clientY, targetId: null, targetPos: null })
        pendingDragRef.current = null
      }
      return
    }
    if (!drag) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const vp = stateRef.current.viewport
    const cx = (e.clientX - rect.left - vp.panX) / vp.zoom
    const cy = (e.clientY - rect.top - vp.panY) / vp.zoom

    let targetId: string | null = null
    let targetPos: DropPosition | null = null
    for (const [id, geom] of Object.entries(layout.geometry)) {
      if (id === drag.nodeId) continue
      if (cx >= geom.x && cx <= geom.x + geom.width && cy >= geom.y && cy <= geom.y + geom.height) {
        const ry = (cy - geom.y) / geom.height
        targetId = id
        targetPos = ry < 0.25 ? 'BEFORE' : ry > 0.75 ? 'AFTER' : 'INSIDE'
        break
      }
    }
    setDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, targetId, targetPos } : null)
  }, [drag, canEdit, layout.geometry, dispatch])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (panningRef.current) {
      panningRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
      setIsPanning(false)
      return
    }
    pendingPanRef.current = null
    pendingDragRef.current = null
    if (!drag) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (drag.targetId && drag.targetPos) {
      dispatch({ type: 'MOVE_NODE', payload: { nodeId: drag.nodeId, targetId: drag.targetId, position: drag.targetPos } })
    }
    setDrag(null)
  }, [drag, dispatch])

  const { viewport } = state
  const transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`
  const draggingNode = drag ? state.nodes[drag.nodeId] : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WbsMenubar
        syncStatus={state.sync.status}
        lastSavedAt={state.sync.lastSavedAt}
        zoom={viewport.zoom}
        panX={viewport.panX}
        panY={viewport.panY}
        canUndo={state.history.past.length > 0}
        canRedo={state.history.future.length > 0}
        canEdit={canEdit}
        nodes={state.nodes}
        rootId={state.rootId}
        selectedNodeIds={state.selectedNodeIds}
        projetoId={projetoId}
        dispatch={dispatch}
        hasCopiedStyle={state.clipboard.copiedStyle !== null}
        onFitScreen={fitToScreen}
        onManualSave={handleManualSave}
        onRequestDelete={() => setConfirmDelete(true)}
        showStylePanel={showStylePanel}
        onToggleStylePanel={() => setShowStylePanel(v => !v)}
        onPasteStyle={() => {
          const s = stateRef.current
          if (s.clipboard.copiedStyle && s.selectedNodeIds.length > 0) {
            dispatch({ type: 'PASTE_STYLE_TO_SELECTED' })
            toast(`Estilo aplicado a ${s.selectedNodeIds.length} elemento(s)`, 'success')
          }
        }}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          data-wbs-canvas=""
          className="relative flex-1 overflow-hidden bg-[#f8fafc] select-none"
          style={{ cursor: drag || isPanning ? 'grabbing' : spaceDown ? 'grab' : 'default' }}
          onClick={() => dispatch({ type: 'SET_SELECTION', payload: { nodeIds: [] } })}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          {/* Transformed layer */}
          <div style={{ transform, transformOrigin: '0 0', position: 'absolute', willChange: 'transform' }}>
            {/* Connectors */}
            <svg
              style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
              width={layout.bounds.width || 1}
              height={layout.bounds.height || 1}
            >
              {layout.connectors.map(c => (
                <path key={`${c.fromId}-${c.toId}`} d={c.path} stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
              ))}
              {/* Drop target indicator */}
              {drag?.targetId && drag.targetPos && layout.geometry[drag.targetId] && (() => {
                const g = layout.geometry[drag.targetId]
                return (
                  <rect
                    x={g.x - 2} y={g.y - 2} width={g.width + 4} height={g.height + 4}
                    fill="none"
                    stroke={drag.targetPos === 'INSIDE' ? '#3b82f6' : '#10b981'}
                    strokeWidth="2" rx="7"
                    strokeDasharray={drag.targetPos !== 'INSIDE' ? '5 3' : undefined}
                  />
                )
              })()}
            </svg>

            {/* Nodes */}
            {Object.values(state.nodes).map(node => {
              const geom = layout.geometry[node.id]
              if (!geom) return null
              return (
                <WbsNodeCard
                  key={node.id}
                  node={node}
                  geom={geom}
                  isSelected={state.selectedNodeIds.includes(node.id)}
                  isEditing={state.editingNodeId === node.id}
                  rollup={rollups[node.id]}
                  isDragTarget={drag?.targetId === node.id}
                  onSelect={handleNodeSelect}
                  dispatch={dispatch}
                />
              )
            })}
          </div>

          {/* Coordinate indicator */}
          <div className="absolute bottom-2 left-2 text-xs text-gray-400 select-none pointer-events-none font-mono">
            x: {Math.round(-viewport.panX / viewport.zoom)}  y: {Math.round(-viewport.panY / viewport.zoom)}
          </div>

          {/* Empty state hint */}
          {state.rootId && Object.keys(state.nodes).length === 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
              <p className="text-xs text-gray-400 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200">
                Tab = filho • Enter = irmão • F2 = renomear
              </p>
            </div>
          )}
        </div>

        {/* Painel de estilo — popover flutuante, só aparece quando aberto pela toolbar */}
        {showStylePanel && state.selectedNodeIds.length > 0 && (
          <WbsPropertiesPanel
            selectedNodeIds={state.selectedNodeIds}
            nodes={state.nodes}
            rollups={rollups}
            canEdit={canEdit}
            dispatch={dispatch}
            onClose={() => setShowStylePanel(false)}
          />
        )}
      </div>

      {/* DnD ghost */}
      {drag && draggingNode && (
        <div style={{
          position: 'fixed', left: drag.x + 12, top: drag.y - NODE_H / 2,
          width: layout.geometry[drag.nodeId]?.width ?? NODE_W, height: NODE_H, boxSizing: 'border-box',
          backgroundColor: draggingNode.style.backgroundColor,
          border: `${draggingNode.style.borderWidth}px solid ${draggingNode.style.borderColor}`,
          borderRadius: draggingNode.style.borderRadius,
          color: draggingNode.style.textColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.8, pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontSize: draggingNode.style.fontSize, fontWeight: 500,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
            {draggingNode.title}
          </span>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (firstSelectedId) {
            dispatch({ type: 'DELETE_NODE', payload: { nodeId: firstSelectedId } })
            dispatch({ type: 'SET_SELECTION', payload: { nodeIds: [] } })
          }
          setConfirmDelete(false)
        }}
        title="Excluir elemento"
        message={`Excluir "${selectedNode?.title ?? 'este nó'}" e toda a subárvore? Use Ctrl+Z para desfazer.`}
        cancelVariant="primary"
        cancelAutoFocus
        confirmLabel="Excluir"
      />
    </div>
  )
}

export default function WbsCanvas({ initialTree, projetoId, canEdit }: WbsCanvasProps) {
  return (
    <WbsProvider initialTree={initialTree}>
      <WbsCanvasInner projetoId={projetoId} canEdit={canEdit} />
    </WbsProvider>
  )
}
