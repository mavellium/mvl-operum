'use client'

import React, { type Dispatch, useEffect, useRef } from 'react'
import type { WbsNodeClient, WbsNodeGeometry, WbsRollup } from '@/types/wbs'
import type { WbsAction } from '@/lib/wbsReducer'

interface WbsNodeCardProps {
  node: WbsNodeClient
  geom: WbsNodeGeometry
  isSelected: boolean
  isEditing: boolean
  rollup: WbsRollup | undefined
  isDragTarget: boolean
  onSelect: (nodeId: string, multi: boolean) => void
  dispatch: Dispatch<WbsAction>
}

function fmtCost(v: number) {
  if (v === 0) return ''
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

const WbsNodeCard = React.memo(function WbsNodeCard({
  node, geom, isSelected, isEditing, rollup, isDragTarget, onSelect, dispatch,
}: WbsNodeCardProps) {
  const isParent = node.childrenIds.length > 0
  const effectiveCost = rollup ? rollup.cost : (node.properties.cost ?? 0)
  const effectiveDays = rollup ? rollup.durationDays : (node.properties.durationDays ?? 0)
  const hasChips = effectiveCost > 0 || effectiveDays > 0

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const ring = isSelected
    ? '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59,130,246,0.2)'
    : isDragTarget
      ? '0 0 0 2px #10b981'
      : 'none'

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
        boxSizing: 'border-box',
        backgroundColor: node.style.backgroundColor,
        border: `${node.style.borderWidth}px solid ${node.style.borderColor}`,
        borderRadius: node.style.borderRadius,
        color: node.style.textColor,
        fontSize: node.style.fontSize,
        boxShadow: ring,
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onClick={e => {
        e.stopPropagation()
        if (e.ctrlKey || e.metaKey) { onSelect(node.id, true); return }
        // Clique num nó já selecionado entra direto em edição; senão, apenas seleciona.
        if (isSelected && !isEditing) {
          dispatch({ type: 'SET_EDITING', payload: { nodeId: node.id } })
        } else {
          onSelect(node.id, false)
        }
      }}
      onDoubleClick={e => { e.stopPropagation(); dispatch({ type: 'SET_EDITING', payload: { nodeId: node.id } }) }}
    >
      {/* Collapse toggle */}
      {isParent && (
        <button
          style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, lineHeight: 1, color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_COLLAPSED', payload: { nodeId: node.id, collapsed: !node.collapsed } }) }}
          title={node.collapsed ? 'Expandir' : 'Recolher'}
        >
          {node.collapsed ? `+${node.childrenIds.length}` : '−'}
        </button>
      )}

      {/* Code + Title */}
      <div style={{ position: 'absolute', top: 4, left: 8, right: 8, bottom: hasChips ? 18 : 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
            <span style={{ whiteSpace: 'nowrap', fontWeight: 500, color: node.style.textColor, flexShrink: 0 }}>
              {node.code}
            </span>
            <input
              ref={inputRef}
              autoFocus
              defaultValue={node.title}
              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 3, padding: '0 4px', fontSize: node.style.fontSize, color: node.style.textColor, outline: 'none' }}
              onBlur={e => {
                const t = e.currentTarget.value.trim()
                if (t && t !== node.title) dispatch({ type: 'RENAME_NODE', payload: { nodeId: node.id, title: t } })
                dispatch({ type: 'SET_EDITING', payload: { nodeId: null } })
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { dispatch({ type: 'SET_EDITING', payload: { nodeId: null } }); e.stopPropagation() }
                e.stopPropagation()
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        ) : (
          <span style={{ whiteSpace: 'nowrap', fontWeight: 500, lineHeight: 1.3 }}>
            {node.code} {node.title}
          </span>
        )}
      </div>

      {/* Chips */}
      {hasChips && (
        <div style={{ position: 'absolute', bottom: 3, left: 6, right: 6, display: 'flex', gap: 6, alignItems: 'center', fontSize: 9, opacity: 0.75 }}>
          {effectiveCost > 0 && (
            <span title={rollup?.isRolledUp ? 'Valor calculado (rollup)' : undefined}>
              💰 {fmtCost(effectiveCost)}{rollup?.isRolledUp ? ' Σ' : ''}
            </span>
          )}
          {effectiveDays > 0 && (
            <span title={rollup?.isRolledUp ? 'Valor calculado (rollup)' : undefined}>
              ⏱ {effectiveDays}d{rollup?.isRolledUp ? ' Σ' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

export default WbsNodeCard
