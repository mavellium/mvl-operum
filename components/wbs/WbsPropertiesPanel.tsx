'use client'

import { useEffect, useRef, useState, type Dispatch } from 'react'
import { X } from 'lucide-react'
import type { WbsNodeClient, WbsRollup, WbsNodeStyle, WbsNodeProperties, WbsLayoutOrientation } from '@/types/wbs'
import type { WbsAction } from '@/lib/wbsReducer'

interface Props {
  selectedNodeIds: string[]
  nodes: Record<string, WbsNodeClient>
  rollups: Record<string, WbsRollup>
  canEdit: boolean
  dispatch: Dispatch<WbsAction>
  onClose: () => void
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest py-1.5 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-1 mb-2">
      <span className="text-[11px] text-gray-600 shrink-0 leading-tight">{label}</span>
      {children}
    </div>
  )
}

// ── Color picker + hex text (sincronizados) ────────────────────────────────────

function ColorField({
  label, value, mixed, disabled, onChange,
}: { label: string; value: string; mixed: boolean; disabled?: boolean; onChange: (v: string) => void }) {
  const [localHex, setLocalHex] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const [prevMixed, setPrevMixed] = useState(mixed)

  if (!mixed && (prevValue !== value || prevMixed !== mixed)) {
    setPrevValue(value)
    setPrevMixed(mixed)
    setLocalHex(value)
  }

  const handleHex = (v: string) => {
    setLocalHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-gray-200 p-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={mixed ? '' : localHex}
          maxLength={7}
          placeholder={mixed ? '—' : '#000000'}
          disabled={disabled}
          onChange={e => handleHex(e.target.value)}
          onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(localHex)) setLocalHex(value) }}
          className="w-16 text-[11px] font-mono border border-gray-200 rounded px-1.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
    </FieldRow>
  )
}

// ── Número + sufixo ────────────────────────────────────────────────────────────

function NumField({
  label, value, min, max, step, suffix, disabled, placeholder, title: tooltip, onChange,
}: {
  label: string; value: number | undefined; min: number; max?: number; step?: number;
  suffix?: string; disabled?: boolean; placeholder?: string; title?: string;
  onChange: (v: number) => void
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1" title={tooltip}>
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value ?? ''}
          disabled={disabled}
          placeholder={placeholder ?? String(min)}
          onChange={e => { if (e.target.value !== '') onChange(Number(e.target.value)) }}
          className="w-14 text-[11px] text-right border border-gray-200 rounded px-1.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        {suffix && <span className="text-[11px] text-gray-400 shrink-0">{suffix}</span>}
      </div>
    </FieldRow>
  )
}

// ── Helpers de valor comum ─────────────────────────────────────────────────────

function commonStr(nodes: WbsNodeClient[], selector: (n: WbsNodeClient) => string): { same: true; value: string } | { same: false; value: string } {
  const vals = nodes.map(selector)
  const first = vals[0] ?? ''
  return vals.every(v => v === first) ? { same: true, value: first } : { same: false, value: first }
}

function commonNum(nodes: WbsNodeClient[], selector: (n: WbsNodeClient) => number): { same: true; value: number } | { same: false; value: number } {
  const vals = nodes.map(selector)
  const first = vals[0] ?? 0
  return vals.every(v => v === first) ? { same: true, value: first } : { same: false, value: first }
}

function commonPropNum(nodes: WbsNodeClient[], key: keyof WbsNodeProperties): { same: true; value: number | undefined } | { same: false; value: number | undefined } {
  const vals = nodes.map(n => n.properties[key] as number | undefined)
  const first = vals[0]
  return vals.every(v => v === first) ? { same: true, value: first } : { same: false, value: first }
}

// ── Painel principal ───────────────────────────────────────────────────────────

export default function WbsPropertiesPanel({ selectedNodeIds, nodes, rollups, canEdit, dispatch, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou pressionar Escape — é um popover, não faz mais parte do fluxo do canvas.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const selectedNodes = selectedNodeIds.map(id => nodes[id]).filter((n): n is WbsNodeClient => Boolean(n))
  const count = selectedNodes.length
  if (count === 0) return null

  const anyParent = selectedNodes.some(n => n.childrenIds.length > 0)

  // ── Valores comuns de estilo ──
  const bgC = commonStr(selectedNodes, n => n.style.backgroundColor)
  const bcC = commonStr(selectedNodes, n => n.style.borderColor)
  const tcC = commonStr(selectedNodes, n => n.style.textColor)
  const bwC = commonNum(selectedNodes, n => n.style.borderWidth)
  const fsC = commonNum(selectedNodes, n => n.style.fontSize)
  const brC = commonNum(selectedNodes, n => n.style.borderRadius)
  const layoutC = commonStr(selectedNodes, n => n.layout)

  // ── Valores comuns de propriedades ──
  const costC = commonPropNum(selectedNodes, 'cost')
  const durC = commonPropNum(selectedNodes, 'durationDays')

  // Rollup do primeiro selecionado (para exibição quando é pai)
  const firstRollup = rollups[selectedNodes[0]?.id]

  const updateStyle = (patch: Partial<WbsNodeStyle>) => {
    dispatch({ type: 'UPDATE_STYLE', payload: { style: patch } })
  }

  const updateProps = (patch: Partial<WbsNodeProperties>) => {
    // Aplica a todos selecionados que forem folhas (cost/duration) ou a todos (desc/owner)
    for (const id of selectedNodeIds) {
      dispatch({ type: 'UPDATE_PROPERTIES', payload: { nodeId: id, properties: patch } })
    }
  }

  const updateLayout = (layout: WbsLayoutOrientation) => {
    for (const id of selectedNodeIds) {
      dispatch({ type: 'SET_LAYOUT', payload: { nodeId: id, layout } })
    }
  }

  const LEAF_ONLY_TOOLTIP = 'Editável apenas em elementos folha'

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-4 z-30 w-64 max-h-[calc(100%-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800">
            {count === 1 ? (
              <span title={selectedNodes[0].title} className="truncate block">{selectedNodes[0].title}</span>
            ) : (
              `${count} elementos selecionados`
            )}
          </p>
          {count === 1 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{selectedNodes[0].code}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-1 transition-colors cursor-pointer"
          aria-label="Fechar painel de estilo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 pt-2 pb-4 flex-1 overflow-y-auto">

        {/* ─── ESTILO ─── */}
        <Section title="Estilo">
          <ColorField
            label="Cor de fundo"
            value={bgC.value}
            mixed={!bgC.same}
            disabled={!canEdit}
            onChange={v => updateStyle({ backgroundColor: v })}
          />
          <ColorField
            label="Cor da borda"
            value={bcC.value}
            mixed={!bcC.same}
            disabled={!canEdit}
            onChange={v => updateStyle({ borderColor: v })}
          />
          <ColorField
            label="Cor do texto"
            value={tcC.value}
            mixed={!tcC.same}
            disabled={!canEdit}
            onChange={v => updateStyle({ textColor: v })}
          />
          <NumField
            label="Espessura da borda"
            value={bwC.same ? bwC.value : undefined}
            min={0} max={8} step={1} suffix="px"
            placeholder={!bwC.same ? '—' : undefined}
            disabled={!canEdit}
            onChange={v => updateStyle({ borderWidth: v })}
          />
          <NumField
            label="Tamanho da fonte"
            value={fsC.same ? fsC.value : undefined}
            min={8} max={24} step={1} suffix="px"
            placeholder={!fsC.same ? '—' : undefined}
            disabled={!canEdit}
            onChange={v => updateStyle({ fontSize: v })}
          />
          <NumField
            label="Raio da borda"
            value={brC.same ? brC.value : undefined}
            min={0} max={24} step={1} suffix="px"
            placeholder={!brC.same ? '—' : undefined}
            disabled={!canEdit}
            onChange={v => updateStyle({ borderRadius: v })}
          />

          <FieldRow label="Layout dos filhos">
            <select
              value={layoutC.same ? layoutC.value : ''}
              disabled={!canEdit}
              onChange={e => updateLayout(e.target.value as WbsLayoutOrientation)}
              className="text-[11px] border border-gray-200 rounded px-1.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
            >
              {!layoutC.same && <option value="">—</option>}
              <option value="LADO_A_LADO">Lado a lado</option>
              <option value="ABAIXO">Abaixo</option>
              <option value="ABAIXO_L">Abaixo com L</option>
            </select>
          </FieldRow>

          {canEdit && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => dispatch({ type: 'COPY_STYLE', payload: { nodeId: selectedNodeIds[0] } })}
                className="flex-1 text-[11px] border border-gray-200 rounded py-1 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                Copiar estilo
              </button>
              <button
                onClick={() => dispatch({ type: 'PASTE_STYLE_TO_SELECTED' })}
                className="flex-1 text-[11px] border border-gray-200 rounded py-1 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                Colar estilo
              </button>
            </div>
          )}
        </Section>

        <div className="border-t border-gray-100 my-1" />

        {/* ─── PROPRIEDADES ─── */}
        <Section title="Propriedades">
          {/* Custo */}
          <FieldRow label="Custo (R$)">
            {anyParent && count === 1 ? (
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-700">
                  {firstRollup ? `R$ ${firstRollup.cost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                </span>
                <span className="ml-1 text-[10px] text-blue-500">Σ</span>
              </div>
            ) : (
              <div title={anyParent ? LEAF_ONLY_TOOLTIP : undefined}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={costC.same ? (costC.value ?? '') : ''}
                  placeholder={!costC.same ? '—' : '0,00'}
                  disabled={!canEdit || anyParent}
                  onChange={e => {
                    const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                    updateProps({ cost: v })
                  }}
                  className="w-24 text-[11px] text-right border border-gray-200 rounded px-1.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </FieldRow>

          {/* Duração */}
          <FieldRow label="Duração (dias)">
            {anyParent && count === 1 ? (
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-700">
                  {firstRollup ? `${firstRollup.durationDays}d` : '—'}
                </span>
                <span className="ml-1 text-[10px] text-blue-500">Σ</span>
              </div>
            ) : (
              <div title={anyParent ? LEAF_ONLY_TOOLTIP : undefined}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={durC.same ? (durC.value ?? '') : ''}
                  placeholder={!durC.same ? '—' : '0'}
                  disabled={!canEdit || anyParent}
                  onChange={e => {
                    const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                    updateProps({ durationDays: v })
                  }}
                  className="w-24 text-[11px] text-right border border-gray-200 rounded px-1.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </FieldRow>

          {/* Descrição */}
          <div className="mb-2">
            <span className="text-[11px] text-gray-600 block mb-1">Descrição</span>
            <textarea
              value={count === 1 ? (selectedNodes[0].properties.description ?? '') : ''}
              disabled={!canEdit || count > 1}
              rows={3}
              placeholder={count > 1 ? '(múltiplos)' : 'Descreva este elemento…'}
              onChange={e => updateProps({ description: e.target.value || undefined })}
              className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 resize-none text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
